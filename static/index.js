import { loadSummaries, showImageModal } from '/static/utils.js';

// 将 showImageModal 添加到全局作用域，因为它在 HTML 中被直接调用
window.showImageModal = showImageModal;

// DOM 元素
const dateTrigger = document.getElementById('dateTrigger');
const datePicker = document.getElementById('datePicker');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');

// 初始化时隐藏日期选择器
datePicker.style.display = 'none';

// 日期选择器显示/隐藏控制
dateTrigger.addEventListener('click', () => {
    if (datePicker.style.display === 'none') {
        datePicker.style.display = 'block';
        datePicker.classList.add('active');
    } else {
        datePicker.style.display = 'none';
        datePicker.classList.remove('active');
    }
});

// 点击外部关闭日期选择器
document.addEventListener('click', (e) => {
    if (!datePicker.contains(e.target) && !dateTrigger.contains(e.target)) {
        datePicker.style.display = 'none';
        datePicker.classList.remove('active');
    }
});

// 处理日期选择
function handleDateChange() {
    const startDate = startTimeInput.value;
    const endDate = endTimeInput.value;
    
    // 在这里可以添加日期验证逻辑
    if (startDate && endDate && startDate > endDate) {
        alert('起始时间不能大于结束时间');
        startTimeInput.value = '';
        endTimeInput.value = '';
    }
}

// 监听日期变化
startTimeInput.addEventListener('change', handleDateChange);
endTimeInput.addEventListener('change', handleDateChange);

// 页面加载完成后加载总结列表
window.addEventListener('load', loadSummaries); 