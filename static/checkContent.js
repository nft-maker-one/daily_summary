// DOM 元素
const contentInput = document.getElementById('content');
const fullscreenContent = document.getElementById('content-fullscreen');
const fullscreenTextarea = document.getElementById('fullscreen-content');
const exitFullscreenButton = document.getElementById('exit-fullscreen');
const confirmModal = document.getElementById('confirm-modal');
const confirmSaveButton = document.getElementById('confirm-save');
const cancelSaveButton = document.getElementById('cancel-save');

// 双击内容输入框进入全屏
contentInput.addEventListener('dblclick', () => {
    fullscreenContent.classList.remove('hidden');
    fullscreenTextarea.value = contentInput.value;
    fullscreenTextarea.focus();
});

// 退出全屏
exitFullscreenButton.addEventListener('click', () => {
    if (fullscreenTextarea.value !== contentInput.value) {
        confirmModal.style.display = 'block';
    } else {
        fullscreenContent.classList.add('hidden');
    }
});

// 确认保存
confirmSaveButton.addEventListener('click', () => {
    contentInput.value = fullscreenTextarea.value;
    confirmModal.style.display = 'none';
    fullscreenContent.classList.add('hidden');
});

// 取消保存
cancelSaveButton.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    fullscreenContent.classList.add('hidden');
});


