// 전역 변수
let currentCalendarInfo = null;
let fixedShifts = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadCalendarInfo();

    // 폼 제출 이벤트
    document.getElementById('scheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        generateSchedule();
    });

    // 연도/월 변경 시 달력 정보 업데이트
    document.getElementById('year').addEventListener('change', loadCalendarInfo);
    document.getElementById('month').addEventListener('change', loadCalendarInfo);
});

// 달력 정보 로드
async function loadCalendarInfo() {
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;

    try {
        const response = await fetch('/api/calendar_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ year: parseInt(year), month: parseInt(month) })
        });

        const data = await response.json();

        if (data.success) {
            currentCalendarInfo = data.data;
            displayCalendarInfo(data.data);
        } else {
            showError('달력 정보를 불러오는데 실패했습니다: ' + data.error);
        }
    } catch (error) {
        showError('서버 연결 오류: ' + error.message);
    }
}

// 달력 정보 표시
function displayCalendarInfo(info) {
    document.getElementById('calendarInfo').style.display = 'block';
    document.getElementById('numDays').textContent = info.num_days;
    document.getElementById('firstDay').textContent = info.first_day_name;
    document.getElementById('lastDay').textContent = info.last_day_name;

    // 고정 근무 날짜 범위 업데이트
    const fixedDayInput = document.getElementById('fixedDay');
    if (fixedDayInput) {
        fixedDayInput.max = info.num_days;
    }
}

// 인원 추가
function addEmployee() {
    const employeesList = document.getElementById('employeesList');
    const index = employeesList.children.length + 1;

    const employeeInput = document.createElement('div');
    employeeInput.className = 'employee-input';
    employeeInput.innerHTML = `
        <input type="text" class="employee-name" placeholder="이름 ${index}" required>
        <button type="button" class="btn-remove" onclick="removeEmployee(this)">✕</button>
    `;

    employeesList.appendChild(employeeInput);
}

// 인원 제거
function removeEmployee(button) {
    const employeesList = document.getElementById('employeesList');
    if (employeesList.children.length > 2) {
        button.parentElement.remove();
    } else {
        alert('최소 2명의 인원이 필요합니다.');
    }
}

// 고정 근무 모달 표시
function showFixedShiftModal() {
    // 직원 목록 업데이트
    const employees = getEmployees();
    const fixedEmployeeSelect = document.getElementById('fixedEmployee');
    fixedEmployeeSelect.innerHTML = '';

    employees.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = name;
        fixedEmployeeSelect.appendChild(option);
    });

    document.getElementById('fixedShiftModal').style.display = 'flex';
}

// 고정 근무 모달 닫기
function closeFixedShiftModal() {
    document.getElementById('fixedShiftModal').style.display = 'none';
}

// 고정 근무 추가
function addFixedShift() {
    const employeeIdx = parseInt(document.getElementById('fixedEmployee').value);
    const day = parseInt(document.getElementById('fixedDay').value) - 1; // 0-based
    const shiftType = parseInt(document.getElementById('fixedShiftType').value);

    const employees = getEmployees();
    const shiftNames = ['주간(DAY)', '야간(NIGHT)', '비번(OFF_B)', '휴무(OFF_R)'];

    // 유효성 검사
    if (!currentCalendarInfo || day < 0 || day >= currentCalendarInfo.num_days) {
        alert('유효하지 않은 날짜입니다.');
        return;
    }

    // 중복 확인
    const duplicate = fixedShifts.find(fs =>
        fs.employee_idx === employeeIdx && fs.day === day
    );

    if (duplicate) {
        alert('해당 직원의 해당 날짜에 이미 고정 근무가 지정되어 있습니다.');
        return;
    }

    // 추가
    fixedShifts.push({
        employee_idx: employeeIdx,
        day: day,
        shift_type: shiftType,
        employee_name: employees[employeeIdx],
        shift_name: shiftNames[shiftType]
    });

    displayFixedShifts();
    closeFixedShiftModal();
}

// 고정 근무 제거
function removeFixedShift(index) {
    fixedShifts.splice(index, 1);
    displayFixedShifts();
}

// 고정 근무 목록 표시
function displayFixedShifts() {
    const fixedShiftsList = document.getElementById('fixedShiftsList');
    fixedShiftsList.innerHTML = '';

    if (fixedShifts.length === 0) {
        fixedShiftsList.innerHTML = '<p style="color: #7F8C8D; font-size: 14px;">고정 근무가 없습니다.</p>';
        return;
    }

    fixedShifts.forEach((fs, index) => {
        const item = document.createElement('div');
        item.className = 'fixed-shift-item';
        item.innerHTML = `
            <span>${fs.employee_name} - ${fs.day + 1}일 ${fs.shift_name}</span>
            <button onclick="removeFixedShift(${index})">✕</button>
        `;
        fixedShiftsList.appendChild(item);
    });
}

// 직원 목록 가져오기
function getEmployees() {
    const employeeInputs = document.querySelectorAll('.employee-name');
    const employees = [];

    employeeInputs.forEach(input => {
        const name = input.value.trim();
        if (name) {
            employees.push(name);
        }
    });

    return employees;
}

// 근무표 생성
async function generateSchedule() {
    // 입력 데이터 수집
    const year = parseInt(document.getElementById('year').value);
    const month = parseInt(document.getElementById('month').value);
    const workDays = parseInt(document.getElementById('workDays').value);
    const employees = getEmployees();

    // 유효성 검사
    if (employees.length < 2) {
        showError('최소 2명 이상의 인원이 필요합니다.');
        return;
    }

    if (!currentCalendarInfo) {
        showError('달력 정보를 먼저 불러와주세요.');
        return;
    }

    if (workDays > currentCalendarInfo.num_days) {
        showError(`근무일수(${workDays}일)가 해당 월의 총 일수(${currentCalendarInfo.num_days}일)를 초과할 수 없습니다.`);
        return;
    }

    // UI 업데이트
    hideError();
    hideResult();
    showLoading();

    try {
        const response = await fetch('/api/generate_schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                year: year,
                month: month,
                employees: employees,
                work_days: workDays,
                fixed_shifts: fixedShifts
            })
        });

        const data = await response.json();

        hideLoading();

        if (data.success) {
            displaySchedule(data);
        } else {
            showError(data.error);
        }
    } catch (error) {
        hideLoading();
        showError('서버 연결 오류: ' + error.message);
    }
}

// 근무표 표시
function displaySchedule(data) {
    const resultSection = document.getElementById('resultSection');
    resultSection.style.display = 'block';

    // 상태 정보
    document.getElementById('solverStatus').textContent = data.status;
    document.getElementById('resultYearMonth').textContent =
        `${data.result.config.year}년 ${data.result.config.month}월`;

    // 테이블 생성
    const table = document.getElementById('scheduleTable');
    table.innerHTML = '';

    // 헤더
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>이름</th>';

    for (let d = 1; d <= data.result.config.num_days; d++) {
        const th = document.createElement('th');
        th.textContent = d;
        headerRow.appendChild(th);
    }

    headerRow.innerHTML += '<th>DAY</th><th>NIGHT</th><th>OFF_B</th><th>OFF_R</th>';
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 본문
    const tbody = document.createElement('tbody');

    data.result.schedule.forEach(emp => {
        const row = document.createElement('tr');

        // 이름
        const nameCell = document.createElement('td');
        nameCell.textContent = emp.name;
        nameCell.style.fontWeight = '600';
        row.appendChild(nameCell);

        // 근무표
        emp.shifts.forEach(shift => {
            const cell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `shift-badge shift-${shift.name.toLowerCase()}`;
            badge.textContent = shift.symbol;
            cell.appendChild(badge);
            row.appendChild(cell);
        });

        // 통계
        ['day_count', 'night_count', 'offb_count', 'offr_count'].forEach(key => {
            const cell = document.createElement('td');
            cell.textContent = emp[key];
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // 통계 섹션
    displayStatistics(data.result.statistics);

    // 스크롤
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// 통계 표시
function displayStatistics(statistics) {
    const statisticsSection = document.getElementById('statisticsSection');
    statisticsSection.innerHTML = '<h3>📊 근무표 통계</h3>';

    // 날짜별 인원 수
    const dailyTable = document.createElement('table');
    dailyTable.innerHTML = `
        <thead>
            <tr>
                <th>날짜</th>
                <th>주간 인원</th>
                <th>야간 인원</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');
    statistics.daily_coverage.forEach(day => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${day.day}일</td>
            <td>${day.day_workers}명</td>
            <td>${day.night_workers}명</td>
        `;
        tbody.appendChild(row);
    });

    dailyTable.appendChild(tbody);
    statisticsSection.appendChild(dailyTable);
}

// 근무표 다운로드 (CSV)
function downloadSchedule() {
    const table = document.getElementById('scheduleTable');
    let csv = [];

    // 헤더
    const headers = [];
    table.querySelectorAll('thead th').forEach(th => {
        headers.push(th.textContent);
    });
    csv.push(headers.join(','));

    // 데이터
    table.querySelectorAll('tbody tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
            const badge = td.querySelector('.shift-badge');
            row.push(badge ? badge.textContent : td.textContent);
        });
        csv.push(row.join(','));
    });

    // 다운로드
    const csvContent = '\uFEFF' + csv.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const yearMonth = document.getElementById('resultYearMonth').textContent;
    link.setAttribute('href', url);
    link.setAttribute('download', `근무표_${yearMonth}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 폼 초기화
function resetForm() {
    document.getElementById('scheduleForm').reset();
    fixedShifts = [];
    displayFixedShifts();
    hideResult();
    hideError();
    loadCalendarInfo();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// UI 헬퍼 함수
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    document.getElementById('errorText').textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function hideResult() {
    document.getElementById('resultSection').style.display = 'none';
}
