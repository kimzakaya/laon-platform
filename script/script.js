// 전역 변수
let serviceData = {};
let currentPage = 'home';
let selectedIndustries = [];
let selections = {};
let totalVisitChart = null;
let todayVisitChart = null;
let quoteChart = null;

const pages = {
    home: document.getElementById('homePage'),
    estimate: document.getElementById('estimatePage'),
    form: document.getElementById('formPage')
};

// ===== 스프레드시트에서 데이터 로드 (JSONP 방식) =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBBejSggPc6Yh5i2PfqAJhIkvLXe1FKVd_o12eCIci8lQhzeM1HP18PJcbzo3rYDP8/exec';

async function loadServiceData() {
    try {
        const callbackName = 'jsonpCallback_' + Date.now();
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                serviceData = data;
                console.log('✅ 서비스 데이터 로드 완료:', serviceData);
                resolve(true);
            };
            
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

// ===== 통계 데이터 로드 =====
async function loadStats() {
    try {
        const callbackName = 'statsCallback_' + Date.now();
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            
            const timeout = setTimeout(() => {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                console.error('❌ 통계 로드 타임아웃');
                // 타임아웃 시 기본값으로 표시
                updateStats({
                    totalVisitCount: 0,
                    todayVisitCount: 0,
                    quoteCount: 0,
                    recentLogs: []
                });
                resolve(false);
            }, 10000);
            
            window[callbackName] = function(data) {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                if (data && data.error) {
                    console.error('통계 로드 실패:', data.error);
                    // 에러 시 기본값으로 표시
                    updateStats({
                        totalVisitCount: 0,
                        todayVisitCount: 0,
                        quoteCount: 0,
                        recentLogs: []
                    });
                    resolve(false);
                    return;
                }
                
                console.log('✅ 통계 데이터 로드 완료:', data);
                updateStats(data);
                resolve(true);
            };
            
            script.src = `${APPS_SCRIPT_URL}?action=getStats&callback=${callbackName}&t=${Date.now()}`;
            script.onerror = function() {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                console.error('❌ 통계 로드 실패 - 네트워크 오류');
                // 에러 시 기본값으로 표시
                updateStats({
                    totalVisitCount: 0,
                    todayVisitCount: 0,
                    quoteCount: 0,
                    recentLogs: []
                });
                resolve(false);
            };
            
            document.body.appendChild(script);
        });
    } catch (error) {
        console.error('❌ 통계 로드 실패:', error);
        return false;
    }
}

// ===== 방문자 수 기록 =====
async function recordVisit() {
    try {
        const callbackName = 'visitCallback_' + Date.now();
        
        return new Promise((resolve) => {
            const script = document.createElement('script');
            
            const timeout = setTimeout(() => {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                resolve(false);
            }, 5000);
            
            window[callbackName] = function(result) {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                resolve(result.success);
            };
            
            script.src = `${APPS_SCRIPT_URL}?action=recordVisit&callback=${callbackName}&t=${Date.now()}`;
            script.onerror = function() {
                clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                resolve(false);
            };
            
            document.body.appendChild(script);
        });
    } catch (error) {
        console.error('방문 기록 실패:', error);
        return false;
    }
}

// ===== 통계 업데이트 (차트 & 롤링 리스트) =====
function updateStats(data) {
    // ✅ 안전하게 값 가져오기 (undefined 방지)
    const totalVisitCount = data.totalVisitCount || 0;
    const todayVisitCount = data.todayVisitCount || 0;
    const quoteCount = data.quoteCount || 0;
    const recentLogs = data.recentLogs || [];
    
    console.log('📊 통계 업데이트:', {totalVisitCount, todayVisitCount, quoteCount});
    
    // 누적 방문자 수 업데이트
    const totalVisitEl = document.getElementById('totalVisitCount');
    if (totalVisitEl) {
        totalVisitEl.textContent = totalVisitCount + '명';
    }
    
    // 오늘 방문자 수 업데이트
    const todayVisitEl = document.getElementById('todayVisitCount');
    if (todayVisitEl) {
        todayVisitEl.textContent = todayVisitCount + '명';
    }
    
    // 견적 수 업데이트
    const quoteCountEl = document.getElementById('quoteCount');
    if (quoteCountEl) {
        quoteCountEl.textContent = quoteCount + '건';
    }
    
    // 누적 방문자 도넛 차트
    const totalVisitCanvas = document.getElementById('totalVisitChart');
    if (totalVisitCanvas) {
        const totalVisitCtx = totalVisitCanvas.getContext('2d');
        if (totalVisitChart) totalVisitChart.destroy();
        totalVisitChart = new Chart(totalVisitCtx, {
            type: 'doughnut',
            data: {
                labels: ['누적 방문', '목표'],
                datasets: [{
                    data: [totalVisitCount, Math.max(1000 - totalVisitCount, 0)],
                    backgroundColor: ['#8b5cf6', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    // 오늘 방문자 도넛 차트
    const todayVisitCanvas = document.getElementById('todayVisitChart');
    if (todayVisitCanvas) {
        const todayVisitCtx = todayVisitCanvas.getContext('2d');
        if (todayVisitChart) todayVisitChart.destroy();
        todayVisitChart = new Chart(todayVisitCtx, {
            type: 'doughnut',
            data: {
                labels: ['오늘 방문', '목표'],
                datasets: [{
                    data: [todayVisitCount, Math.max(500 - todayVisitCount, 0)],
                    backgroundColor: ['#3b82f6', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    // 견적 도넛 차트
    const quoteCanvas = document.getElementById('quoteChart');
    if (quoteCanvas) {
        const quoteCtx = quoteCanvas.getContext('2d');
        if (quoteChart) quoteChart.destroy();
        quoteChart = new Chart(quoteCtx, {
            type: 'doughnut',
            data: {
                labels: ['신청 완료', '목표'],
                datasets: [{
                    data: [quoteCount, Math.max(50 - quoteCount, 0)],
                    backgroundColor: ['#10b981', '#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    // 실시간 문의 롤링 리스트
    const rollingList = document.getElementById('rollingList');
    if (rollingList) {
        rollingList.innerHTML = '';
        
        recentLogs.forEach((log, index) => {
            const item = document.createElement('div');
            item.className = 'rolling-item text-sm text-gray-700 py-2 px-4 bg-gray-50 rounded-lg';
            item.style.animationDelay = `${index * 0.1}s`;
            item.innerHTML = `
                <span class="font-semibold text-blue-600">${log.name}</span> 님 
                <span class="text-gray-600">(${log.business})</span>이 
                <span class="font-semibold">견적 신청</span>을 하셨습니다.
                <span class="text-gray-500 text-xs ml-2">${log.date}</span>
            `;
            rollingList.appendChild(item);
        });
        
        // 롤링 애니메이션 시작
        if (recentLogs.length > 0) {
            startRolling();
        }
    }
}

// ===== 롤링 애니메이션 =====
function startRolling() {
    const rollingList = document.getElementById('rollingList');
    if (!rollingList) return;
    
    let currentScroll = 0;
    
    setInterval(() => {
        currentScroll += 1;
        if (currentScroll >= rollingList.scrollHeight / 2) {
            currentScroll = 0;
        }
        rollingList.style.transform = `translateY(-${currentScroll}px)`;
    }, 50);
}

// ===== 초기화 =====
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 페이지 로딩 시작...');
    
    // 방문 기록
    await recordVisit();
    
    // 통계 로드
    await loadStats();
    
    // 서비스 데이터 로드
    const success = await loadServiceData();
    if (success) {
        document.getElementById('loadingScreen').style.display = 'none';
        showPage('home');
        console.log('✅ 초기화 완료!');
    }
});