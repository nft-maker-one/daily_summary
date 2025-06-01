package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	IMAGE_DIR  string
	STATIC_DIR string
	PORT       int
)

// Summary 模型定义
type Summary struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Time      string    `json:"time"`
	Images    []Image   `json:"images" gorm:"foreignKey:SummaryID"`
	CreatedAt time.Time `json:"-"`
	UpdatedAt time.Time `json:"-"`
}

// Image 模型定义
type Image struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	SummaryID uint      `json:"summary_id"`
	FilePath  string    `json:"file_path"`
	FileName  string    `json:"file_name"`
	CreatedAt time.Time `json:"-"`
	UpdatedAt time.Time `json:"-"`
}

var db *gorm.DB

func init() {
	// 加载.env文件
	var err error
	if err = godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	IMAGE_DIR = os.Getenv("UPLOAD_DIR")
	STATIC_DIR = os.Getenv("STATIC_DIR")
	if STATIC_DIR == "" {
		// 使用绝对路径
		workDir, err := os.Getwd()
		if err != nil {
			log.Fatal("Failed to get working directory:", err)
		}
		STATIC_DIR = filepath.Join(workDir, "static")
	}

	PORT, err = strconv.Atoi(os.Getenv("SERVER_PORT"))
	if err != nil {
		log.Fatal("Failed to parse port:", err)
	}

	// 确保目录存在
	if err = os.MkdirAll(IMAGE_DIR, 0755); err != nil {
		log.Fatalf("failed to create image folder %v", err)
	}
	if err = os.MkdirAll(STATIC_DIR, 0755); err != nil {
		log.Fatalf("failed to create static folder %v", err)
	}

	// 从环境变量构建数据库连接字符串
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_TIMEZONE"),
	)

	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// 自动迁移数据库结构
	err = db.AutoMigrate(&Summary{}, &Image{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}

func main() {
	r := gin.Default()

	// 静态文件服务，使用绝对路径
	r.StaticFS("/uploads", http.Dir(IMAGE_DIR))
	r.StaticFS("/static", http.Dir(STATIC_DIR))

	// 设置前端入口
	r.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(STATIC_DIR, "index.html"))
	})

	// 处理找不到的路由，返回前端入口
	r.NoRoute(func(c *gin.Context) {
		c.File(filepath.Join(STATIC_DIR, "index.html"))
	})

	// 允许跨域
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 添加新总结
	r.POST("/add", func(c *gin.Context) {
		// 解析multipart form
		if err := c.Request.ParseMultipartForm(32 << 20); err != nil { // 32MB max
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
			return
		}

		// 获取文本数据
		title := c.Request.FormValue("title")
		content := c.Request.FormValue("content")

		if title == "" || content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Title and content are required"})
			return
		}

		// 创建总结记录
		summary := Summary{
			Title:   title,
			Content: content,
			Time:    time.Now().Format("2006-01-02 15:04:05"),
		}

		// 开启事务
		tx := db.Begin()

		// 保存总结
		if err := tx.Create(&summary).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save summary"})
			return
		}

		// 处理图片
		form, _ := c.MultipartForm()
		files := form.File["images"]

		for _, file := range files {
			// 生成唯一文件名
			ext := filepath.Ext(file.Filename)
			newFileName := uuid.New().String() + ext
			filePath := filepath.Join(IMAGE_DIR, newFileName)

			// 保存文件
			if err := c.SaveUploadedFile(file, filePath); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
				return
			}

			// 创建图片记录
			image := Image{
				SummaryID: summary.ID,
				FilePath:  "/uploads/" + newFileName, // 存储相对路径
				FileName:  file.Filename,
			}

			if err := tx.Create(&image).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image record"})
				return
			}
		}

		// 提交事务
		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
			return
		}

		// 返回完整的总结信息
		var result Summary
		if err := db.Preload("Images").First(&result, summary.ID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch created summary"})
			return
		}

		c.JSON(http.StatusOK, result)
	})

	// 获取所有总结
	r.GET("/get", func(c *gin.Context) {
		var summaries []Summary

		// 获取查询参数
		startTime := c.Query("start_time")
		endTime := c.Query("end_time")
		searchTerm := c.Query("search_term")

		// 构建查询
		query := db.Preload("Images").Order("created_at DESC")

		// 添加时间过滤
		if startTime != "" {
			startParseTime, err := time.Parse("2006-01-02", startTime)
			if err != nil {
				fmt.Printf("error format of starttime %s\n", startTime)
				c.JSON(401, gin.H{
					"error": fmt.Sprintf("error format of starttime %s\n", startTime),
				})
				return
			}
			query = query.Where("created_at >= ?", startParseTime)
		}
		if endTime != "" {
			endParseTime, err := time.Parse("2006-01-02", endTime)
			if err != nil {
				fmt.Printf("error format of endtime %s\n", endTime)
				c.JSON(401, gin.H{
					"error": fmt.Sprintf("error format of endtime %s\n", endTime),
				})
				return
			}
			query = query.Where("created_at <= ?", endParseTime)
		}

		// 添加搜索过滤
		if searchTerm != "" {
			query = query.Where("title ILIKE ? OR content ILIKE ?", "%"+searchTerm+"%", "%"+searchTerm+"%")
		}

		// 执行查询
		if err := query.Find(&summaries).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, summaries)
	})

	// 启动服务器
	if err := r.Run(fmt.Sprintf(":%d", PORT)); err != nil {
		log.Fatal("Failed to start server:", err)
	}
	log.Printf("Server started on port %d", PORT)
}
