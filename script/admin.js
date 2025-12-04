// 전역 변수
let consultations = [];
let filteredConsultations = [];
let isAuthenticated = false;

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzig2JN5ZCk25-AQdyecwllCWISir0e1ALULayfJuvRoymNOxt4sYOSYht2nDZchCi-/exec';
const ADMIN_PASSWORD = 'laon2025!'; // 원하는 비밀번호로 변경하세요

// ===== 로그인 처리 =====
function handleLogin() {
    const password = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        errorMsg.classList.add('hidden');
        showAdminScreen();
        loadConsultations();
    } else {
        errorMsg.classList.remove('hidden');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

function showAdminScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminScreen').classList.remove('hidden');
}

// ===== 상담 데이터 로드 (JSONP 방식) =====
async function loadConsultations() {
    try {
        const callbackName = 'jsonpCallback_' + Date.now();
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            
            window[callbackName] = function(data) {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                if (data.error) {
                    console.error('데이터 로드 실패:', data.error);
                    alert('데이터 로드 실패: ' + data.message);
                    reject(false);
                    return;
                }
                
                consultations = data;
                console.log('✅ 상담 데이터 로드 완료:', consultations);
                updateStatistics();
                applyFilters();
                resolve(true);
            };
            
            script.src = `${APPS_SCRIPT_URL}?action=getConsultations&callback=${callbackName}`;
            script.onerror = function() {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                console.error('❌ 데이터 로드 실패');
                alert('상담 데이터를 불러오는데 실패했습니다.');
                reject(false);
            };
            
            document.body.appendChild(script);
        });
    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        alert('상담 데이터를 불러오는데 실패했습니다.');
        return false;
    }
}

// ===== 통계 업데이트 =====
function updateStatistics() {
    const total = consultations.length;
    const waiting = consultations.filter(c => c.status === '대기중').length;
    const progress = consultations.filter(c => c.status === '진행중').length;
    const completed = consultations.filter(c => c.status === '완료').length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('waitingCount').textContent = waiting;
    document.getElementById('progressCount').textContent = progress;
    document.getElementById('completedCount').textContent = completed;
}

// ===== 필터 적용 =====
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const sortOrder = document.getElementById('sortOrder').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // 필터링
    filteredConsultations = consultations.filter(consultation => {
        const matchesStatus = statusFilter === 'all' || consultation.status === statusFilter;
        const matchesSearch = !searchTerm || 
            consultation.name.toLowerCase().includes(searchTerm) ||
            consultation.industry.toLowerCase().includes(searchTerm) ||
            consultation.region.toLowerCase().includes(searchTerm);
        
        return matchesStatus && matchesSearch;
    });
    
    // 정렬
    filteredConsultations.sort((a, b) => {
        switch (sortOrder) {
            case 'newest':
                return new Date(b.timestamp) - new Date(a.timestamp);
            case 'oldest':
                return new Date(a.timestamp) - new Date(b.timestamp);
            case 'amount-high':
                return b.totalAmount - a.totalAmount;
            case 'amount-low':
                return a.totalAmount - b.totalAmount;
            default:
                return 0;
        }
    });
    
    renderConsultations();
}

// ===== 상담 목록 렌더링 =====
function renderConsultations() {
    const container = document.getElementById('consultationsList');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredConsultations.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    container.innerHTML = '';
    
    filteredConsultations.forEach(consultation => {
        const card = createConsultationCard(consultation);
        container.appendChild(card);
    });
}

// ===== 상담 카드 생성 =====
function createConsultationCard(consultation) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-all';
    
    const statusColors = {
        '대기중': 'bg-yellow-100 text-yellow-800',
        '진행중': 'bg-blue-100 text-blue-800',
        '완료': 'bg-green-100 text-green-800'
    };
    
    const date = new Date(consultation.timestamp);
    const formattedDate = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-1">${consultation.name}</h3>
                <p class="text-sm text-gray-600">${consultation.industry} · ${consultation.region}</p>
            </div>
            <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusColors[consultation.status]}">
                ${consultation.status}
            </span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <p class="text-xs text-gray-500 mb-1">연락처</p>
                <p class="text-sm font-semibold text-gray-800">${consultation.phone}</p>
            </div>
            <div>
                <p class="text-xs text-gray-500 mb-1">견적 금액</p>
                <p class="text-sm font-bold text-blue-600">${consultation.totalAmount.toLocaleString()}원</p>
            </div>
        </div>
        
        <div class="mb-4">
            <p class="text-xs text-gray-500 mb-1">신청 일시</p>
            <p class="text-sm text-gray-700">${formattedDate}</p>
        </div>
        
        <div class="flex gap-2">
            <button class="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-all view-detail-btn">
                상세보기
            </button>
            <select class="status-select px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
                <option value="대기중" ${consultation.status === '대기중' ? 'selected' : ''}>대기중</option>
                <option value="진행중" ${consultation.status === '진행중' ? 'selected' : ''}>진행중</option>
                <option value="완료" ${consultation.status === '완료' ? 'selected' : ''}>완료</option>
            </select>
        </div>
    `;
    
    // 상세보기 버튼 이벤트
    card.querySelector('.view-detail-btn').addEventListener('click', () => {
        showDetailModal(consultation);
    });
    
    // 상태 변경 이벤트
    card.querySelector('.status-select').addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        await updateStatus(consultation.rowIndex, newStatus);
    });
    
    return card;
}

// ===== 상세보기 모달 =====
function showDetailModal(consultation) {
    const modal = document.getElementById('detailModal');
    const modalContent = document.getElementById('modalContent');
    
    let services = [];
    try {
        services = JSON.parse(consultation.selectedServices);
    } catch (e) {
        console.error('서비스 데이터 파싱 오류:', e);
    }
    
    let servicesHTML = '';
    services.forEach(industry => {
        servicesHTML += `
            <div class="mb-4">
                <h4 class="font-bold text-gray-800 mb-2 flex items-center">
                    <span class="mr-2">${industry.icon}</span>
                    ${industry.industry}
                </h4>
                ${industry.services.map(service => `
                    <div class="flex justify-between text-sm text-gray-700 ml-6 mb-1">
                        <span>· ${service.serviceName}: ${service.optionLabel}</span>
                        <span class="font-semibold">${service.price.toLocaleString()}원</span>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    modalContent.innerHTML = `
        <div class="space-y-6">
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 class="font-bold text-gray-800 mb-3">고객 정보</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">이름</p>
                        <p class="font-semibold text-gray-800">${consultation.name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">업종</p>
                        <p class="font-semibold text-gray-800">${consultation.industry}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">연락처</p>
                        <p class="font-semibold text-gray-800">${consultation.phone}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">지역</p>
                        <p class="font-semibold text-gray-800">${consultation.region}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 class="font-bold text-gray-800 mb-3">선택 서비스</h3>
                ${servicesHTML}
                <div class="border-t border-gray-300 mt-4 pt-4 flex justify-between font-bold text-lg">
                    <span>총 견적 금액</span>
                    <span class="text-blue-600">${consultation.totalAmount.toLocaleString()}원</span>
                </div>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 class="font-bold text-gray-800 mb-2">신청 정보</h3>
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">신청 일시</p>
                        <p class="font-semibold text-gray-800">${new Date(consultation.timestamp).toLocaleString('ko-KR')}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-1">현재 상태</p>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${
                            consultation.status === '대기중' ? 'bg-yellow-100 text-yellow-800' :
                            consultation.status === '진행중' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                        }">
                            ${consultation.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// ===== 상태 업데이트 =====
async function updateStatus(rowIndex, newStatus) {
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateStatus',
                rowIndex: rowIndex,
                status: newStatus
            }),
            headers: { 'Content-Type': 'text/plain' }
        });
        
        const result = await response.text();
        if (result === 'Success') {
            // 로컬 데이터 업데이트
            const consultation = consultations.find(c => c.rowIndex === rowIndex);
            if (consultation) {
                consultation.status = newStatus;
            }
            
            updateStatistics();
            applyFilters();
            
            // 성공 알림 (간단하게)
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ 상태가 업데이트되었습니다';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        } else {
            alert('상태 업데이트 실패: ' + result);
        }
    } catch (error) {
        alert('오류: ' + error.message);
    }
}

// ===== 이벤트 리스너 =====
document.getElementById('loginBtn').addEventListener('click', handleLogin);

document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.textContent = '🔄 새로고침 중...';
    await loadConsultations();
    btn.disabled = false;
    btn.textContent = '🔄 새로고침';
});

document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('sortOrder').addEventListener('change', applyFilters);
document.getElementById('searchInput').addEventListener('input', applyFilters);

document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('detailModal').classList.add('hidden');
});

// 모달 외부 클릭 시 닫기
document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') {
        document.getElementById('detailModal').classList.add('hidden');
    }
});

// ===== 초기화 =====
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 관리자 페이지 로딩...');
    // 로그인 화면만 표시
});