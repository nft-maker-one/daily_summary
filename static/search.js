import { loadSummaries } from '/static/utils.js';
import config from '/static/config.js';

// DOM 元素
const searchBtn = document.getElementById('searchBtn');
const contentInput = document.getElementById('contentInput');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('close-sidebar');

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

// 搜索功能

searchBtn.addEventListener('click', async () => {
    const searchTerm = contentInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

    try {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.append('search_term', searchTerm);
        if (startTime) queryParams.append('start_time', startTime);
        if (endTime) queryParams.append('end_time', endTime);

        const response = await fetch(`${config.getApiUrl('getSummaries')}?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json()
        displaySearchResults(data)

    } catch (error) {
        console.error('Error searching summaries:', error);
        alert('搜索失败，请稍后重试');
    }
});

function displaySearchResults(results) {
    sidebar.classList.add('open');
    const searchResults = document.getElementById('search-results')
    console.log(results)
    searchResults.innerHTML = ''
    if (results.length==0) {
        searchResults= '<p class="text-gray-400 p-4">无搜索结果</p>'
        return
    }
    results.forEach(result => {
        const div = document.createElement('div')
        div.className = 'sidebar-item'
        div.innerHTML = `
            <h3>${result.title}</h3>
            <p>${result.content.substring(0,50)}${result.content.length>50?'...':''}</p>
            <p class="text-xs text-gray-400"></p>
        `
        div.addEventListener('click', () => {
            displaySummaryInTimeline(result);
            sidebar.classList.remove('open');
        });
        
        
        searchResults.appendChild(div)
    })
}




// 在 timeline 中显示详细内容
        function displaySummaryInTimeline(result) {
            // console.log(result)
            // console.log(result.title)
            // console.log(result.time)
            // console.log(result.content)
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = ''; // 清空现有内容
            const div = document.createElement('div');
            div.className = 'bg-gray-50 rounded-xl p-6 shadow-lg transition-shadow hover:shadow-xl';
            div.innerHTML = `
                <h2 class="text-2xl font-bold text-blue-600 mb-2">记录 #${result.title}</h2>
                <p class="text-gray-600 mb-4">${result.time}</p>
                <p class="text-gray-800">${result.content}</p>
                <div class="mt-4 flex flex-wrap gap-3 button-container">
                    <button class="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors">
                        查看详情
                    </button>
                    <button class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors">
                        退出选定
                    </button>
                </div>
            `;
            

            div.querySelector(".button-container").addEventListener('click',() => {
                if (event.target.tagName === 'BUTTON') {
            // 获取被点击的按钮文本（或通过类名区分）
                    const buttonText = event.target.textContent.trim();
                    
                    // 执行退出逻辑（根据你的需求调整）
                    if (buttonText === '退出选定') {
                        // 关闭模态框或其他退出操作
                        // console.log("退出选定")
                        timeline.removeChild(div)
                        loadSummaries()
                        return;  // 提前返回，避免执行后续逻辑
                    } else if (buttonText === '查看详情') {
                        document.getElementById('modal-title').textContent = `记录 #${result.title}`;
                        document.getElementById('modal-time').textContent = result.time;
                        document.getElementById('modal-content').textContent = result.content;
                        document.getElementById('modal').classList.remove('hidden');
                        const imgModal = document.getElementById("img-modal")

                        const imgUrls = result.images
                        console.log(imgUrls)
                        console.log(imgModal)
                        let img_html = ''
                        imgUrls.forEach(url => {
                            console.log(`${config.apiBaseUrl}${url.file_path}`)
                            img_html += ` <img
                            class="w-full h-full object-cover rounded-lg shadow-sm" 
                            src="${config.apiBaseUrl}${url.file_path}" 
                            alt="模态框图片"
                            loading="lazy"
                            "> `
                        })
                        imgModal.innerHTML = img_html
                    }
                }
            })
            timeline.appendChild(div);
        }

