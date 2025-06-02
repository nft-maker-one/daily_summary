// 获取所有添加按钮
document.addEventListener('DOMContentLoaded', () => {
    const addButtons = document.querySelectorAll('button[data-modal-type]');
    
    // 为每个按钮添加点击事件监听器
    addButtons.forEach(button => {
        const modalType = button.getAttribute('data-modal-type');
        button.addEventListener('click', () => openModal(modalType));
    });
});

// 打开模态框的函数
function openModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.classList.remove('hidden');
        
        // 根据类型初始化不同的表单
        initializeForm(type);
    }
}

// 初始化表单的函数
function initializeForm(type) {
    // 重置表单
    const form = document.getElementById(`${type}Form`);
    if (form) {
        form.reset();
    }

    // 根据不同类型设置特定的初始值或行为
    switch (type) {
        case 'plan':
            // 初始化计划表单
            setupPlanForm();
            break;
        case 'todo':
            // 初始化待办表单
            setupTodoForm();
            break;
        case 'checkin':
            // 初始化打卡表单
            setupCheckinForm();
            break;
    }
}

// 设置计划表单
function setupPlanForm() {
    // 设置默认的提醒时间选项等
    const reminderSelect = document.querySelector('#planForm select[name="reminderTime"]');
    if (reminderSelect) {
        // 可以设置默认选项或添加其他初始化逻辑
    }
}

// 设置待办表单
function setupTodoForm() {
    // 设置默认的截止日期为今天等
    const deadlineInput = document.querySelector('#todoForm input[name="deadline"]');
    if (deadlineInput) {
        deadlineInput.valueAsDate = new Date();
    }
}

// 设置打卡表单
function setupCheckinForm() {
    // 可以添加打卡特定的初始化逻辑
    const historyContainer = document.querySelector('#checkinForm .history-container');
    if (historyContainer) {
        // 清空之前的历史记录
        historyContainer.innerHTML = '';
    }
}

// 导出需要的函数
export {
    openModal,
    initializeForm
}; 