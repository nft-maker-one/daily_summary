import config from '/static/config.js';

// DOM 元素引用
const timeline = document.getElementById('timeline');
const modalTitle = document.getElementById('modal-title');
const modalTime = document.getElementById('modal-time');
const modalContent = document.getElementById('modal-content');
const modal = document.getElementById('modal');

/**
 * 加载并显示所有总结
 * @returns {Promise<void>}
 */
export async function loadSummaries() {
    try {
        const response = await fetch(config.getApiUrl('getSummaries'));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const summaries = await response.json();
        timeline.innerHTML = '';
        let isLeft = true;
        for (let i = 0; i < summaries.length; i++) {
            const summary = summaries[i];
            const summaryContainer = document.createElement('div');
            summaryContainer.classList.add('summary-container', 'flex', 'items-center', 'relative');
            if (isLeft) {
                summaryContainer.innerHTML = `
                    <div class="summary-title-box mr-8">
                        <h2 class="summary-title text-xl font-bold">${summary.title}</h2>
                        <p class="summary-time text-gray-600">${summary.time}</p>
                    </div>
                    <div class="summary-box">
                        <p class="summary-content text-gray-700">${summary.content.slice(0, 100)}${summary.content.length > 100 ? '...' : ''}</p>
                        ${summary.images && summary.images.length > 0 ? `
                            <div class="image-grid grid grid-cols-2 gap-2 mt-4">
                                ${summary.images.map(image => `
                                    <img src="${config.apiBaseUrl}${image.file_path}" 
                                        alt="${image.file_name}" 
                                        class="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        onclick="showImageModal('${config.apiBaseUrl}${image.file_path}')">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                summaryContainer.innerHTML = `
                    <div class="summary-box">
                        <p class="summary-content text-gray-700">${summary.content.slice(0, 100)}${summary.content.length > 100 ? '...' : ''}</p>
                        ${summary.images && summary.images.length > 0 ? `
                            <div class="image-grid grid grid-cols-2 gap-2 mt-4">
                                ${summary.images.map(image => `
                                    <img src="${config.apiBaseUrl}${image.file_path}" 
                                        alt="${image.file_name}" 
                                        class="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        onclick="showImageModal('${config.apiBaseUrl}${image.file_path}')">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="summary-title-box ml-8">
                        <h2 class="summary-title text-xl font-bold">${summary.title}</h2>
                        <p class="summary-time text-gray-600">${summary.time}</p>
                    </div>
                `;
            }
            const readMoreButton = document.createElement('button');
            readMoreButton.textContent = '查看详情';
            readMoreButton.classList.add('read-more', 'bg-blue-500', 'text-white', 'p-3', 'rounded-lg', 'hover:bg-blue-600', 'mt-4', 'absolute', 'bottom-0', 'left-[70%]', '-translate-x-1/2');
            readMoreButton.addEventListener('click', () => {
                modalTitle.textContent = summary.title;
                modalTime.textContent = summary.time;
                modalContent.textContent = summary.content;
                modal.classList.remove('hidden');
            });
            summaryContainer.appendChild(readMoreButton);

            if (i > 0) {
                const prevSummary = timeline.children[i - 1];
                const connector = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const startX = prevSummary.offsetLeft + prevSummary.offsetWidth / 2;
                const startY = prevSummary.offsetTop + prevSummary.offsetHeight;
                const endX = summaryContainer.offsetLeft + summaryContainer.offsetWidth / 2;
                const endY = summaryContainer.offsetTop;
                const controlX1 = startX;
                const controlY1 = startY + (endY - startY) / 2;
                const controlX2 = endX;
                const controlY2 = endY - (endY - startY) / 2;
                // connector.setAttribute('d', `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`);
                connector.classList.add('connector');
                timeline.appendChild(connector);
            }

            timeline.appendChild(summaryContainer);
            isLeft = !isLeft;
        }
    } catch (error) {
        console.error('Error loading summaries:', error);
        timeline.innerHTML = '<div class="text-red-500">加载数据失败，请稍后重试</div>';
    }
}

/**
 * 显示图片模态框
 * @param {string} imageSrc - 图片URL
 */
export function showImageModal(imageSrc) {
    const modalImage = document.getElementById('modal-image');
    const imageModal = document.getElementById('image-modal');
    modalImage.src = imageSrc;
    imageModal.classList.remove('hidden');
    imageModal.classList.add('flex');
}

// 导出其他工具函数
// export default {
//     loadSummaries,
//     showImageModal
// };
export default {
    loadSummaries,
    showImageModal
}
