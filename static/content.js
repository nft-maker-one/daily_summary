import config from '/static/config.js';
import { loadSummaries } from '/static/utils.js';

// 存储已上传的图片数据
let uploadedImages = [];

const contentInput = document.getElementById('content');
const titleInput = document.getElementById('title');
const addSummaryButton = document.getElementById('add-summary');

const contentFullscreen = document.getElementById('content-fullscreen');
const fullscreenContent = document.getElementById('fullscreen-content');

const confirmSaveButton = document.getElementById('confirm-save');
const cancelSaveButton = document.getElementById('cancel-save');

const confirmModal = document.getElementById('confirm-modal');

const closeModalButton = document.getElementById('close-modal')

// 悬浮功能
contentInput.addEventListener('focus', () => {
    contentFullscreen.classList.remove('hidden');
    fullscreenContent.value = contentInput.value;
});


//添加总结接口
addSummaryButton.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    

    if (!title || !content) {
        alert('请填写标题和内容');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    // 添加图片文件
    for (let i = 0; i < uploadedImages.length; i++) {
        formData.append('images', uploadedImages[i].file);
    }

    try {
        const response = await fetch(config.getApiUrl('addSummary'), {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Summary added:', result);

        // 清空输入
        titleInput.value = '';
        contentInput.value = '';
        imageUpload.value = '';
        imagePreview.innerHTML = '';

        // 重新加载总结列表
        await loadSummaries();
    } catch (error) {
        console.error('Error adding summary:', error);
        alert('添加总结失败，请稍后重试');
    }
});

// 保存总结接口
confirmSaveButton.addEventListener('click', () => {
    contentInput.value = fullscreenContent.value;
    contentFullscreen.classList.add('hidden');
    confirmModal.style.display = 'none';
});


// 取消保存
cancelSaveButton.addEventListener('click', () => {
    contentFullscreen.classList.add('hidden');
    confirmModal.style.display = 'none';
});


// 保存
closeModalButton.addEventListener('click', () => {
    modal.classList.add('hidden');
    document.getElementById('img-modal').innerHTML=''
});


// 图片预览相关代码
const imagePreview = document.getElementById('image-preview');
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const closeModalPrePic = document.getElementById('close-modal-pre-pic');
const imageUpload = document.getElementById('image-upload');



// 处理图片上传和预览
function handleImageUpload(event) {
    const files = event.target.files;
    if (files.length+uploadedImages.length > 5) {
        alert('最多只能上传5张图片');
        event.target.value = ''; // 清空选择
        return;
    }

    // 检查文件大小
    let oversizedFiles = Array.from(files).filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
        alert('以下文件超过5MB限制：\n' + oversizedFiles.map(f => f.name).join('\n'));
        event.target.value = ''; // 清空选择
        return;
    }

    const initialChildCount = imagePreview.children.length;
    

    for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = {
                file: file,
                dataUrl: e.target.result
            };
            uploadedImages.push(imageData);
            console.log('Added image to uploadedImages:', uploadedImages);

            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative group cursor-pointer transform transition-all duration-300 hover:scale-105';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full h-48 object-cover rounded-lg shadow-md';
            img.alt = file.name;

            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 rounded-lg flex items-center justify-center';

            const icon = document.createElement('i');
            icon.className = 'fas fa-search-plus text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity duration-300';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300';
            deleteButton.innerHTML = '<i class="fas fa-times"></i>';
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                const idx = uploadedImages.indexOf(imageData);
                if (idx !== -1) {
                    uploadedImages.splice(idx, 1);
                    imgContainer.remove();
                    if (uploadedImages.length === 0) {
                        imageUpload.value = '';
                    }
                    console.log('After delete, uploadedImages:', uploadedImages);
                }
            };

            overlay.appendChild(icon);
            imgContainer.appendChild(img);
            imgContainer.appendChild(overlay);
            imgContainer.appendChild(deleteButton);

            imgContainer.addEventListener('click', () => {
                modalImage.src = e.target.result;
                imageModal.classList.remove('hidden');
                imageModal.classList.add('flex');
            });

            imagePreview.appendChild(imgContainer);
            console.log('Appended imgContainer, total children:', imagePreview.children.length);
        };
        reader.readAsDataURL(file);
    }
}


// 为文件输入框添加拖放支持
imageUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUpload.parentElement.classList.add('border-blue-500');
});

imageUpload.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUpload.parentElement.classList.remove('border-blue-500');
});

imageUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUpload.parentElement.classList.remove('border-blue-500');
    
    const dt = e.dataTransfer;
    const files = dt.files;
    
    imageUpload.files = files;
    handleImageUpload({ target: { files: files } });
});

// 关闭模态框
closeModalPrePic.addEventListener('click', () => {
    imageModal.classList.add('hidden');
    imageModal.classList.remove('flex');
});

// 点击模态框背景关闭
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.add('hidden');
        imageModal.classList.remove('flex');
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !imageModal.classList.contains('hidden')) {
        imageModal.classList.add('hidden');
        imageModal.classList.remove('flex');
    }
});

// 监听文件选择变化
imageUpload.addEventListener('change', handleImageUpload);



