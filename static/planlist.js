import config from "/static/config.js";

let user = null;
let plans = [];
let todos = [];
let checkIns = [];
let modalType = null;

// Initialize notification permissions
if (!("Notification" in window)) {
  console.warn("浏览器不支持通知功能");
} else if (Notification.permission !== "granted") {
  Notification.requestPermission().catch(err => console.error("通知权限请求失败:", err));
}

// Login handling
const loginBtn = document.getElementById('login-btn');
const greeting = document.getElementById('user-greeting');
if (user) {
  loginBtn.classList.add('hidden');
  greeting.textContent = `欢迎, ${user.name}`;
  greeting.classList.remove('hidden');
}
loginBtn.addEventListener('click', () => {
  user = { id: 1, name: '用户' };
  loginBtn.classList.add('hidden');
  greeting.textContent = `欢迎, ${user.name}`;
  greeting.classList.remove('hidden');
  showToast('登录成功');
});

// Toast notification
function showToast(message) {
  console.log(message)
  console.log(1111)
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Modal management
function openModal(type, planId = null) {
  modalType = type;
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const deadlineGroup = document.getElementById('modal-deadline-group');
  const imageUploadGroup = document.getElementById('modal-image-group');
  
  modal.classList.remove('hidden');
  modal.children[0].classList.add('modal-enter');
  
  // Reset form
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-description').value = '';
  document.getElementById('modal-reminder-time').value = '24';
  if (imageUploadGroup) {
    const imagePreview = imageUploadGroup.querySelector('.image-preview');
    if (imagePreview) {
      imagePreview.innerHTML = '';
    }
  }
  
  if (type === 'checkin') {
    console.log("into checkin section")
    title.textContent = '添加打卡';
    deadlineGroup.classList.add('hidden');
    imageUploadGroup.classList.remove('hidden');
    
    // If planId is provided, store it in the modal for submission
    if (planId) {
      modal.dataset.planId = planId;
      // Find the plan name and show it in the modal
      const plan = plans.find(p => p.plan.id === planId);
      if (plan) {
        const planInfo = document.createElement('div');
        planInfo.className = 'mb-4 p-3 bg-blue-50 rounded-lg text-blue-600';
        planInfo.textContent = `关联计划: ${plan.plan.name}`;
        title.parentNode.insertBefore(planInfo, document.getElementById('modal-name'));
      }
    }
  } else {
    title.textContent = type === 'plan' ? '添加计划' : '添加待办';
    deadlineGroup.classList.remove('hidden');
    imageUploadGroup.classList.add('hidden');
    delete modal.dataset.planId;
    
    // Remove plan info if it exists
    const planInfo = modal.querySelector('.bg-blue-50');
    if (planInfo) {
      planInfo.remove();
    }
    
    // Configure deadline input
    const deadlineInput = document.getElementById('modal-deadline');
    if (deadlineInput) {
      deadlineInput.type = 'datetime-local';
      deadlineInput.step = '60';
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      deadlineInput.min = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.children[0].classList.add('modal-exit');
  console.log('触发关闭')
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.children[0].classList.remove('modal-enter', 'modal-exit');
    modalType = null;
  }, 300);
}

// Backend interaction
async function createOrUpdateCheckIn(checkIn) {
  try {
    const formData = new FormData();
    formData.append('plan_id', checkIn.plan_id);
    formData.append('name', checkIn.name);
    formData.append('description', checkIn.description);
    
    // Add image if exists
    const imageInput = document.getElementById('modal-image');
    if (imageInput && imageInput.files[0]) {
      formData.append('image', imageInput.files[0]);
    }
    
    const response = await fetch(config.getApiUrl('checkIns'), {
      method: 'POST',
      body: formData // FormData will automatically set the correct Content-Type
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '后端错误');
    }
    return result.data;
  } catch (err) {
    console.error('Check-in 操作失败:', err);
    showToast(`打卡失败: ${err.message}`);
    throw err;
  }
}

async function fetchCheckIns() {
  try {
    const response = await fetch(config.getApiUrl('checkIns'));
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '后端错误');
    }
    return result.data;
  } catch (err) {
    console.error('获取 check-ins 失败:', err);
    showToast('加载打卡数据失败，将使用本地数据');
    return [];
  }
}

async function createOrUpdatePlan(plan) {
  try {
    console.log(plan)
    const response = await fetch(config.getApiUrl('plans'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '后端错误');
    }
    return result.data;
  } catch (err) {
    console.error('Plan 操作失败:', err);
    showToast(`计划操作失败: ${err.message}`);
    throw err;
  }
}

async function fetchPlans() {
  try {
    const response = await fetch(config.getApiUrl('plans'));
    console.log(config.getApiUrl('plans'))
    const result = await response.json();
    console.log(result)
    if (!result.success) {
      throw new Error(result.error || '后端错误');
    }
    return result.data;
  } catch (err) {
    console.error('获取 plans 失败:', err);
    showToast('加载计划数据失败，将使用本地数据');
    return [];
  }
}

async function createOrUpdateTodo(todo) {
  try {
    // 确保 completed 字段是布尔值
    const todoData = {
      ...todo,
      completed: Boolean(todo.completed)  // 显式转换为布尔值
    };
    
    console.log('Sending todo data:', todoData);
    
    const response = await fetch(config.getApiUrl('todos'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(todoData)
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (!result?.success) {
      throw new Error(result.error || '后端错误');
    }
    return result.data;
  } catch (err) {
    console.error('Todo 操作失败:', err);
    showToast(`待办操作失败: ${err.message}`);
    throw err;
  }
}

async function fetchTodos() {
  try {
    const response = await fetch(config.getApiUrl('todos'));
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || '后端错误');
    }
    return result.data;
  } catch (err) {
    console.error('获取 todos 失败:', err);
    showToast('加载待办数据失败，将使用本地数据');
    return [];
  }
}

// Modal submission
async function submitModal() {
  const modal = document.getElementById('modal');
  const name = document.getElementById('modal-name').value.trim();
  const description = document.getElementById('modal-description').value.trim();
  const deadline = document.getElementById('modal-deadline').value;
  const reminderTime = document.getElementById('modal-reminder-time').value;

  if (!name) {
    showToast('请输入名称');
    return;
  }

  try {
    if (modalType === 'checkin') {
      const planId = parseInt(modal.dataset.planId);
      if (!planId) {
        showToast('无法找到关联的计划');
        return;
      }
      
      const checkIn = {
        id: Date.now(),
        plan_id: planId,
        name,
        description
      };
      
      const savedCheckIn = await createOrUpdateCheckIn(checkIn);
      // Update the plans array with the new check-in
      plans = plans.map(p => {
        if (p.plan.id === planId) {
          return {
            ...p,
            check_ins: [...p.check_ins, savedCheckIn]
          };
        }
        return p;
      });
      
      renderPlans();
      showToast('打卡添加成功');
      
    } else {
      // Handle plan and todo submissions
      const item = {
        id: Date.now(),
        name,
        description,
        completed: false,  // 确保这是一个布尔值
        reminderTime: 24
      };

      if (!deadline) {
        showToast('请输入截止时间');
        return;
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        showToast('无效的截止时间格式');
        return;
      }

      item.deadline = deadlineDate.toISOString();
      item.reminderTime = parseInt(reminderTime) || 24;

      if (modalType === 'plan') {
        item.reminders = [];
        const savedPlan = await createOrUpdatePlan(item);
        plans = [...plans, { plan: savedPlan, check_ins: [] }];
        // scheduleReminder(savedPlan);
        renderPlans();
        showToast('计划添加成功');
      } else if (modalType === 'todo') {
        console.log('Creating todo with data:', item);
        const savedTodo = await createOrUpdateTodo(item);
        console.log('Saved todo:', savedTodo);
        todos.push(savedTodo);
        // scheduleReminder(savedTodo);
        renderTodos();
        showToast('待办添加成功');
      }
    }
    
    closeModal();
  } catch (err) {
    console.error('提交失败:', err);
    showToast(`提交失败: ${err.message}`);
  }
}

// Fix scheduleReminder
function scheduleReminder(item) {

  if (Notification.permission === 'granted' && item.deadline) {
    try {
      const now = new Date();
      const deadline = new Date(item.deadline);
      const reminderTimeMs = (item.reminderTime || 24) * 60 * 60 * 1000; // ms单位
      const timeDiff = deadline - now;
      console.log('Reminder timeDiff:', timeDiff, 'deadline:', item.deadline);
      // <span class="text-blue-600 font-medium">${Math.round(progress)}% 完成</span>
      if (timeDiff > 0 && timeDiff < reminderTimeMs) {
        setTimeout(() => {
          new Notification(`${item.name} 即将到期`, { body: `截止时间: ${item.deadline}` });
        }, timeDiff);
      } else {
        console.log('Reminder skipped: timeDiff <= 0');
      }
    } catch (err) {
      console.error('提醒调度失败:', err);
      showToast('提醒设置失败');
    }
  } else {
    console.log('Reminder not scheduled: Permission not granted or no deadline');
  }
}

// Rendering functions
function renderPlans() {
  const list = document.getElementById('plans-list');
  list.innerHTML = '';
  
  if (!plans || plans.length === 0) {
    list.innerHTML = '<p class="text-gray-500">暂无计划</p>';
    return;
  }
  plans = plans.sort((a,b) => {
    const date1 = new Date(a.plan.updated_at)
    const date2 = new Date(b.plan.updated_at)
    return date2-date1
  })
  plans.forEach(({plan, check_ins}) => {
    const div = document.createElement('div');
    div.className = 'bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-gray-50 to-gray-100 mb-4';
    
    // Plan header section
    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex justify-between items-start mb-4';
    
    const contentDiv = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'text-xl font-semibold text-blue-600 mb-2';
    title.textContent = plan.name;
    
    const desc = document.createElement('p');
    desc.className = 'text-gray-600';
    desc.style.whiteSpace = 'normal'
    desc.style.wordBreak = 'break-word'
    desc.textContent = plan.description || '无描述';
    
    contentDiv.appendChild(title);
    contentDiv.appendChild(desc);
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex items-center gap-2';
    
    // Add check-in button
    const checkInBtn = document.createElement('button');
    checkInBtn.className = 'px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-300 text-sm flex items-center gap-1 shadow-sm';
    checkInBtn.innerHTML = '<i class="fas fa-plus"></i> 打卡';
    checkInBtn.onclick = () => openModal('checkin', plan.id);
    
    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'p-2 text-gray-500 hover:text-blue-600 transition-all duration-300 transform';
    toggleBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
    
    buttonContainer.appendChild(checkInBtn);
    buttonContainer.appendChild(toggleBtn);
    
    headerDiv.appendChild(contentDiv);
    headerDiv.appendChild(buttonContainer);
    div.appendChild(headerDiv);
    
    // Progress section
    const progressSection = document.createElement('div');
    progressSection.className = 'mb-4 p-4 bg-gray-50 rounded-lg';
    
    const now = new Date();
    const start = new Date(plan.created_at);
    const end = new Date(plan.deadline);
    const totalDuration = end - start;
    const elapsed = now - start;
    const progress = 100-Math.min(Math.max(0, (elapsed / totalDuration) * 100), 100);
    
    // Time info
    const timeInfo = document.createElement('div');
    timeInfo.className = 'grid grid-cols-2 gap-4 mb-3 text-sm';
    
    const startTime = document.createElement('div');
    startTime.innerHTML = `<span class="text-gray-500">开始时间:</span><br><span class="font-medium">${new Date(plan.created_at).toLocaleString()}</span>`;
    
    const endTime = document.createElement('div');
    endTime.innerHTML = `<span class="text-gray-500">截止时间:</span><br><span class="font-medium">${new Date(plan.deadline).toLocaleString()}</span>`;
    
    timeInfo.appendChild(startTime);
    timeInfo.appendChild(endTime);
    
    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'mt-2';
    // <span class="text-blue-600 font-medium">${Math.round(progress)}% 完成</span>
    progressBar.innerHTML = `
      <div class="flex justify-between text-sm mb-1">
        
        <span class="text-gray-500">${Math.ceil((end - now) / (1000 * 60 * 60 * 24))} 天剩余</span>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div class="h-full transition-all duration-500 ${
          progress > 75 ? 'bg-green-500' : progress > 25 ? 'bg-yellow-500' : 'bg-red-500'
        }" style="width: ${progress}%"></div>
      </div>
    `;
    
    progressSection.appendChild(timeInfo);
    progressSection.appendChild(progressBar);
    div.appendChild(progressSection);
    
    // Check-ins section
    const checkInsDiv = document.createElement('div');
    checkInsDiv.className = 'mt-4 space-y-3 hidden';
    
    // Check-ins header
    const checkInsHeader = document.createElement('div');
    checkInsHeader.className = 'flex justify-between items-center mb-2';
    
    const checkInsTitle = document.createElement('h4');
    checkInsTitle.className = 'text-lg font-semibold text-gray-700';
    checkInsTitle.textContent = '打卡记录';
    
    const checkInsCount = document.createElement('span');
    checkInsCount.className = 'px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-sm';
    checkInsCount.textContent = `${check_ins?.length || 0} 次打卡`;
    
    checkInsHeader.appendChild(checkInsTitle);
    checkInsHeader.appendChild(checkInsCount);
    checkInsDiv.appendChild(checkInsHeader);
    
    renderCheckIns(checkInsDiv, check_ins);
    
    div.appendChild(checkInsDiv);
    
    // Toggle functionality
    toggleBtn.addEventListener('click', () => {
      const isExpanded = !checkInsDiv.classList.contains('hidden');
      toggleBtn.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
      checkInsDiv.classList.toggle('hidden');
      
      if (!isExpanded) {
        checkInsDiv.querySelectorAll('.bg-white').forEach((item, index) => {
          item.style.opacity = '0';
          item.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
            item.style.transition = 'all 0.3s ease-out';
          }, index * 100);
        });
      }
    });
    
    list.appendChild(div);
  });
}

function renderTodos() {
  const list = document.getElementById('todos-list');
  list.innerHTML = '';
  if (!todos || todos.length === 0) {
    list.innerHTML = '<p class="text-gray-500">暂无待办</p>';
    return;
  }
  todos.forEach(todo => {
    const div = document.createElement('div');
    div.className = 'bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-gray-50 to-gray-100 flex justify-between items-center';
    const contentDiv = document.createElement('div');
    const title = document.createElement('h3');
    title.className = todo.completed ? 'line-through text-gray-500 text-lg' : 'font-semibold text-blue-600 text-lg';
    title.textContent = todo.name;
    const desc = document.createElement('p');
    desc.className = 'text-gray-600 mt-2';
    desc.textContent = todo.description || '无描述';
    const deadline = document.createElement('p');
    deadline.className = 'text-sm text-gray-500 mt-2';
    deadline.textContent = `截止: ${todo.deadline || '无'}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.className = 'h-5 w-5 text-blue-500 cursor-pointer';
    checkbox.addEventListener('change', async () => {
      try {
        const updatedTodo = { ...todo, completed: !todo.completed };
        const savedTodo = await createOrUpdateTodo(updatedTodo);
        todos = todos.map(t => t.id === todo.id ? savedTodo : t);
        renderTodos();
        showToast('待办状态更新');
      } catch (err) {
        // Error handled in createOrUpdateTodo
      }
    });
    contentDiv.appendChild(title);
    contentDiv.appendChild(desc);
    contentDiv.appendChild(deadline);
    div.appendChild(contentDiv);
    div.appendChild(checkbox);
    list.appendChild(div);
  });
}

function renderCheckIns(checkInsDiv, check_ins) {
  if (check_ins && check_ins.length > 0) {
    check_ins.forEach(checkIn => {
      const checkInItem = document.createElement('div');
      checkInItem.className = 'bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300';
      
      const checkInHeader = document.createElement('div');
      checkInHeader.className = 'flex justify-between items-start mb-2';
      
      const checkInName = document.createElement('h5');
      checkInName.className = 'font-medium text-blue-600';
      checkInName.textContent = checkIn.name;
      
      const checkInTime = document.createElement('span');
      checkInTime.className = 'text-sm text-gray-500';
      checkInTime.textContent = new Date(checkIn.created_at).toLocaleString();
      
      checkInHeader.appendChild(checkInName);
      checkInHeader.appendChild(checkInTime);
      
      const checkInDesc = document.createElement('p');
      checkInDesc.className = 'text-gray-600 text-sm';
      checkInDesc.textContent = checkIn.description || '无描述';
      
      checkInItem.appendChild(checkInHeader);
      checkInItem.appendChild(checkInDesc);
      
      // Add image if exists
      if (checkIn.image_url) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'mt-3';
        const image = document.createElement('img');
        image.src = checkIn.image_url;
        image.className = 'rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity';
        image.onclick = () => {
          // Create lightbox
          const lightbox = document.createElement('div');
          lightbox.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
          const lightboxImg = document.createElement('img');
          lightboxImg.src = checkIn.image_url;
          lightboxImg.className = 'max-h-[90vh] max-w-[90vw] object-contain';
          lightbox.appendChild(lightboxImg);
          lightbox.onclick = () => lightbox.remove();
          document.body.appendChild(lightbox);
        };
        imageContainer.appendChild(image);
        checkInItem.appendChild(imageContainer);
      }
      
      checkInsDiv.appendChild(checkInItem);
    });
  } else {
    const noCheckIns = document.createElement('p');
    noCheckIns.className = 'text-gray-500 text-sm italic text-center py-4';
    noCheckIns.textContent = '暂无打卡记录';
    checkInsDiv.appendChild(noCheckIns);
  }
}

// Initial render
document.addEventListener('DOMContentLoaded', async () => {
  try {
    plans = await fetchPlans();
    todos = await fetchTodos();
  } catch (err) {
    // Errors handled in fetch functions
  }
  
  renderPlans();
  renderTodos();
  if (plans) {
    plans.forEach(({plan}) => {
      scheduleReminder(plan)
    })
  }
  

  const addButtons = document.querySelectorAll('button[data-modal-type]');

  // 为每个按钮添加点击事件监听器
  addButtons.forEach(button => {
      const modalType = button.getAttribute('data-modal-type');
      button.addEventListener('click', () => openModal(modalType));
  });

  const submit_modal = document.getElementById('submitModal');
  submit_modal.addEventListener('click', submitModal);
  const close_modal = document.getElementById('closeModal');
  close_modal.addEventListener('click', closeModal);
});
  