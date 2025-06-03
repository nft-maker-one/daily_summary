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
	"gorm.io/gorm/clause"
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

// Models matching frontend data structures
type Plan struct {
	ID           int64     `json:"id" binding:"required"`
	Name         string    `json:"name" binding:"required"`
	Description  string    `json:"description"`
	Deadline     time.Time `json:"deadline" binding:"required"`
	ReminderTime int       `json:"reminderTime" binding:"required"`
	Reminders    []string  `json:"reminders" binding:"required" gorm:"type:jsonb;default:'[]'"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Todo struct {
	ID           int64     `json:"id" binding:"required"`
	Name         string    `json:"name" binding:"required"`
	Description  string    `json:"description"`
	Deadline     time.Time `json:"deadline" binding:"required"`
	ReminderTime int       `json:"reminderTime" binding:"required"`
	Completed    bool      `json:"completed"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CheckIn struct {
	ID          int64     `json:"id" binding:"required"`
	PlanID      int64     `json:"plan_id" binding:"required"`
	Name        string    `json:"name" binding:"required"`
	Description string    `json:"description"`
	ImageURL    *string   `json:"image_url"` // 可为空的图片URL
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PlanResponse struct {
	Plan     Plan      `json:"plan"`
	CheckIns []CheckIn `json:"check_ins"`
}

func (CheckIn) TableName() string {
	return "check_ins"
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
	err = db.AutoMigrate(&Summary{}, &Image{}, &Plan{}, &CheckIn{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}

func setApi(g *gin.Engine) {
	group := g.Group("/api")
	// 获取计划
	group.GET("/plans", func(ctx *gin.Context) {
		rows, err := db.Table("plans").Order("created_at DESC").Rows()
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var plans []PlanResponse
		plan_ids := []int64{}
		plan_maps := make(map[int64]PlanResponse)
		for rows.Next() {
			var plan Plan
			db.ScanRows(rows, &plan)
			plan_ids = append(plan_ids, plan.ID)
			plan_maps[plan.ID] = PlanResponse{Plan: plan, CheckIns: make([]CheckIn, 0)}
		}
		if len(plan_ids) > 0 {
			var checkIns []CheckIn
			if err := db.Where("plan_id IN (?)", plan_ids).Find(&checkIns).Error; err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			for _, checkIn := range checkIns {
				plan := plan_maps[checkIn.PlanID]
				plan.CheckIns = append(plan.CheckIns, checkIn)
				plan_maps[checkIn.PlanID] = plan
			}
		}
		for _, val := range plan_maps {
			plans = append(plans, val)
		}
		ctx.JSON(http.StatusOK, gin.H{"success": true, "data": plans})
	})
	// 添加计划
	group.POST("/plans", func(ctx *gin.Context) {
		var plan Plan
		if err := ctx.ShouldBindJSON(&plan); err != nil {
			fmt.Println(err)
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fmt.Println(plan)
		plan.CreatedAt = time.Now()

		if err := db.Create(&plan).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, gin.H{"success": true, "data": plan})
	})

	group.GET("/todos", func(ctx *gin.Context) {
		var todos []Todo
		if err := db.Order("created_at DESC").Find(&todos).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "获取待办事项失败 " + err.Error()})
		}
		ctx.JSON(200, gin.H{"success": true, "data": todos})
	})

	group.POST("/todos", func(ctx *gin.Context) {
		var todo Todo
		if err := ctx.ShouldBindJSON(&todo); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误 " + err.Error()})
			return
		}

		// 确保 Completed 字段有值
		if todo.CreatedAt.IsZero() {
			todo.CreatedAt = time.Now()
		}
		todo.UpdatedAt = time.Now()

		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "deadline", "reminder_time", "completed", "updated_at"}),
		}).Create(&todo).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "创建或者更新待办事项失败 " + err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{"success": true, "data": todo})
	})

	// 添加打卡
	group.POST("/checkins", func(ctx *gin.Context) {
		// 解析 multipart form
		if err := ctx.Request.ParseMultipartForm(32 << 20); err != nil { // 32MB max
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "无法解析表单数据"})
			return
		}

		// 获取基本信息
		planID, err := strconv.ParseInt(ctx.Request.FormValue("plan_id"), 10, 64)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "无效的计划ID"})
			return
		}

		checkin := CheckIn{
			ID:          time.Now().UnixNano(),
			PlanID:      planID,
			Name:        ctx.Request.FormValue("name"),
			Description: ctx.Request.FormValue("description"),
			CreatedAt:   time.Now(),
		}

		// 处理图片上传
		file, err := ctx.FormFile("image")
		if err == nil && file != nil {
			// 生成唯一文件名
			ext := filepath.Ext(file.Filename)
			newFileName := uuid.New().String() + ext
			filePath := filepath.Join(IMAGE_DIR, newFileName)

			// 保存文件
			if err := ctx.SaveUploadedFile(file, filePath); err != nil {
				ctx.JSON(http.StatusInternalServerError, gin.H{"error": "图片保存失败"})
				return
			}

			// 设置图片URL
			imageURL := "/uploads/" + newFileName
			checkin.ImageURL = &imageURL
		}

		// 保存打卡记录
		if err := db.Create(&checkin).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{"success": true, "data": checkin})
	})
}

func main() {
	r := gin.Default()

	// 允许跨域
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	// staticFS := http.FileServer(http.Dir(STATIC_DIR))
	// http.Handle("/static/", http.StripPrefix("/static/", staticFS))
	r.StaticFS("/uploads", http.Dir(IMAGE_DIR))
	r.StaticFS("/static", http.Dir(STATIC_DIR))
	setApi(r)
	// 静态文件服务，使用绝对路径

	// 设置前端入口
	r.GET("/", func(c *gin.Context) {
		c.File(filepath.Join(STATIC_DIR, "index.html"))
	})

	// 处理找不到的路由，返回前端入口
	r.NoRoute(func(c *gin.Context) {
		c.File(filepath.Join(STATIC_DIR, "index.html"))
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
