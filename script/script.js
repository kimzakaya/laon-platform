// 전역 변수
let serviceData = {};
let currentPage = 'home';
let selectedIndustries = [];
let selections = {};

const pages = {
    home: document.getElementById('homePage'),
    estimate: document.getElementById('estimatePage'),
    form: document.getElementById('formPage')
};

// ===== 스프레드시트에서 데이터 로드 (JSONP 방식) =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzig2JN5ZCk25-AQdyecwllCWISir0e1ALULayfJuvRoymNOxt4sYOSYht2nDZchCi-/exec';

async function loadServiceData() {
    try {
        // JSONP 방식으로 변경
        const callbackName = 'jsonpCallback_' + Date.now();
        
        return new Promise((resolve, reject) => {
            // script 태그 먼저 생성
            const script = document.createElement('script');
            
            // 콜백 함수 정의
            window[callbackName] = function(data) {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                serviceData = data;
                console.log('✅ 서비스 데이터 로드 완료:', serviceData);
                resolve(true);
            };
            
            // script 태그 설정
            script.src = `${APPS_SCRIPT_URL}?action=getServiceData&callback=${callbackName}`;
            script.onerror = function() {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                console.error('❌ 데이터 로드 실패');
                alert('서비스 데이터를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
                reject(false);
            };
            
            document.body.appendChild(script);
        });
    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        alert('서비스 데이터를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
        return false;
    }
}

// ===== 페이지 관리 =====
function showPage(pageName) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.add('hidden');
    });
    pages[pageName].classList.remove('hidden');
    currentPage = pageName;
    document.getElementById('homeBtn').classList.toggle('hidden', pageName === 'home');
}

// ===== 견적 계산 =====
function calculateTotal() {
    let total = 0;
    selectedIndustries.forEach(industry => {
        if (!serviceData[industry]) return;
        const services = serviceData[industry].services;
        services.forEach(service => {
            const key = `${industry}_${service.id}`;
            const selectedOption = selections[key];
            if (selectedOption) {
                const option = service.options.find(opt => opt.id === selectedOption);
                if (option) total += option.price;
            }
        });
    });
    return total;
}

function updateTotal() {
    const total = calculateTotal();
    document.getElementById('totalAmount').textContent = total.toLocaleString() + '원';
    const proceedBtn = document.getElementById('proceedToFormBtn');
    const hasSelections = Object.keys(selections).length > 0;
    
    if (hasSelections) {
        proceedBtn.classList.add('btn-primary', 'text-white');
        proceedBtn.classList.remove('bg-gray-300', 'text-gray-500');
        proceedBtn.disabled = false;
    } else {
        proceedBtn.classList.remove('btn-primary', 'text-white');
        proceedBtn.classList.add('bg-gray-300', 'text-gray-500');
        proceedBtn.disabled = true;
    }
}

// ===== 서비스 렌더링 =====
function renderAllServices() {
    const container = document.getElementById('allServicesContainer');
    container.innerHTML = '';
    
    selectedIndustries.forEach(industry => {
        if (!serviceData[industry]) return;
        
        const industryData = serviceData[industry];
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        
        let servicesHTML = '';
        industryData.services.forEach(service => {
            let optionsHTML = '';
            service.options.forEach(option => {
                const key = `${industry}_${service.id}`;
                const isSelected = selections[key] === option.id;
                optionsHTML += `
                    <label class="option-label flex items-center justify-between p-4 rounded-lg ${isSelected ? 'selected' : 'bg-white'}">
                        <div class="flex items-center">
                            <input type="radio" name="${key}" value="${option.id}" ${isSelected ? 'checked' : ''} 
                                   class="w-5 h-5 text-blue-600" data-key="${key}" data-option="${option.id}">
                            <span class="option-text ml-3 font-semibold text-base ${isSelected ? '' : 'text-gray-800'}">${option.label}</span>
                        </div>
                        <span class="price-text font-bold text-lg ${isSelected ? '' : 'text-blue-600'}">${option.price.toLocaleString()}원</span>
                    </label>
                `;
            });
            
            servicesHTML += `
                <div class="mb-6 last:mb-0">
                    <h4 class="text-base font-bold text-gray-700 mb-3">${service.name}</h4>
                    <div class="space-y-3">
                        ${optionsHTML}
                    </div>
                </div>
            `;
        });
        
        categorySection.innerHTML = `
            <div class="flex items-center mb-4">
                <span class="text-3xl mr-3">${industryData.icon}</span>
                <h3 class="text-xl font-bold text-gray-800">${industryData.name}</h3>
            </div>
            ${servicesHTML}
        `;
        
        container.appendChild(categorySection);
    });
    
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            selections[e.target.dataset.key] = e.target.dataset.option;
            updateTotal();
            renderAllServices();
        });
    });
}

function renderSummary() {
    const summaryList = document.getElementById('summaryList');
    const summaryTotal = document.getElementById('summaryTotal');
    summaryList.innerHTML = '';
    
    selectedIndustries.forEach(industry => {
        if (!serviceData[industry]) return;
        
        const industryData = serviceData[industry];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-3';
        
        let categoryHTML = `
            <div class="font-bold text-gray-800 mb-1 flex items-center">
                <span class="mr-2">${industryData.icon}</span>
                ${industryData.name}
            </div>
        `;
        
        const services = industryData.services;
        services.forEach(service => {
            const key = `${industry}_${service.id}`;
            const selectedOption = selections[key];
            if (selectedOption) {
                const option = service.options.find(opt => opt.id === selectedOption);
                categoryHTML += `
                    <div class="flex justify-between text-sm text-gray-700 ml-6">
                        <span>· ${service.name}: ${option.label}</span>
                        <span class="font-semibold">${option.price.toLocaleString()}원</span>
                    </div>
                `;
            }
        });
        
        categoryDiv.innerHTML = categoryHTML;
        summaryList.appendChild(categoryDiv);
    });
    
    summaryTotal.textContent = calculateTotal().toLocaleString() + '원';
}

// ===== 이벤트 리스너 =====
document.querySelectorAll('.industry-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const card = e.target.closest('.industry-card');
        const industry = e.target.value;
        
        if (e.target.checked) {
            selectedIndustries.push(industry);
            card.classList.add('selected');
        } else {
            selectedIndustries = selectedIndustries.filter(i => i !== industry);
            card.classList.remove('selected');
            
            Object.keys(selections).forEach(key => {
                if (key.startsWith(industry + '_')) {
                    delete selections[key];
                }
            });
        }
        
        const proceedBtn = document.getElementById('proceedToEstimateBtn');
        const countText = document.getElementById('selectionCount');
        countText.textContent = `선택된 항목: ${selectedIndustries.length}개`;
        
        if (selectedIndustries.length > 0) {
            proceedBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            proceedBtn.classList.add('btn-primary', 'text-white');
            proceedBtn.disabled = false;
        } else {
            proceedBtn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            proceedBtn.classList.remove('btn-primary', 'text-white');
            proceedBtn.disabled = true;
        }
    });
});

document.getElementById('homeBtn').addEventListener('click', () => {
    selectedIndustries = [];
    selections = {};
    document.querySelectorAll('.industry-checkbox').forEach(cb => {
        cb.checked = false;
        cb.closest('.industry-card').classList.remove('selected');
    });
    document.getElementById('selectionCount').textContent = '선택된 항목: 0개';
    showPage('home');
});

document.getElementById('proceedToEstimateBtn').addEventListener('click', () => {
    renderAllServices();
    updateTotal();
    showPage('estimate');
});

document.getElementById('proceedToFormBtn').addEventListener('click', () => {
    renderSummary();
    showPage('form');
});

document.getElementById('submitBtn').addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value;
    const industry = document.getElementById('industryInput').value;
    const phone = document.getElementById('phoneInput').value;
    const region = document.getElementById('regionInput').value;
    
    if (!name || !industry || !phone || !region) {
        alert('모든 항목을 입력해주세요.');
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '제출 중...';
    btn.classList.add('opacity-50');
    
    const total = calculateTotal();
    const selectedServices = selectedIndustries.map(industryKey => {
        if (!serviceData[industryKey]) return null;
        const industryData = serviceData[industryKey];
        return {
            industry: industryData.name,
            icon: industryData.icon,
            services: industryData.services.map(service => {
                const key = `${industryKey}_${service.id}`;
                const selectedOption = selections[key];
                if (selectedOption) {
                    const option = service.options.find(opt => opt.id === selectedOption);
                    return {
                        serviceName: service.name,
                        optionLabel: option.label,
                        price: option.price
                    };
                }
                return null;
            }).filter(s => s !== null)
        };
    }).filter(s => s !== null);
    
    const data = {
        customerInfo: { name, industry, phone, region },
        selectedServices,
        totalAmount: total
    };
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'text/plain' }
        });
        
        const result = await response.text();
        if (result === 'Success') {
            alert('상담 신청이 완료되었습니다! 담당자가 곧 연락드리겠습니다.');
            selectedIndustries = [];
            selections = {};
            document.querySelectorAll('.industry-checkbox').forEach(cb => {
                cb.checked = false;
                cb.closest('.industry-card').classList.remove('selected');
            });
            document.getElementById('nameInput').value = '';
            document.getElementById('industryInput').value = '';
            document.getElementById('phoneInput').value = '';
            document.getElementById('regionInput').value = '';
            document.getElementById('selectionCount').textContent = '선택된 항목: 0개';
            showPage('home');
        } else {
            alert('제출 실패: ' + result);
        }
    } catch (error) {
        alert('오류: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '상담 신청 완료';
        btn.classList.remove('opacity-50');
    }
});

// ===== 초기화 =====
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 페이지 로딩 시작...');
    const success = await loadServiceData();
    if (success) {
        // 로딩 화면 숨기기
        document.getElementById('loadingScreen').style.display = 'none';
        showPage('home');
        console.log('✅ 초기화 완료!');
    }
});