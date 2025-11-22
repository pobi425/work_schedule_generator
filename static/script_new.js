// 전역 상태 관리
const state = {
    currentYear: 2025,
    currentMonth: 11,
    workers: [],
    workDaysPerPerson: 20,
    restDaysPerPerson: 10,
    calendarData: null,
    schedule: {},  // {day: {dayWorkers: [], nightWorkers: [], offbWorkers: [], offrWorkers: []}}
    separateWorkerPairs: [],  // [[worker1, worker2], ...]
    selectedDay: null,
    lastResult: null,  // 백엔드에서 받은 전체 결과 저장
    showOffShifts: true,  // 비번/휴무 표시 여부
    currentSaveKey: null  // 현재 저장된 키 (덮어쓰기용)
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendar();
    updateWorkerCountDisplay();
});

// ===== 달력 관련 함수 =====

function initializeCalendar() {
    loadCalendarInfo(state.currentYear, state.currentMonth);
}

async function loadCalendarInfo(year, month) {
    try {
        const response = await fetch('/api/calendar_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, month })
        });

        const data = await response.json();
        if (data.success) {
            state.calendarData = data.data;

            // 자동 근무일수 설정 (주말 + 공휴일 기반)
            state.workDaysPerPerson = data.data.recommended_work_days;
            state.restDaysPerPerson = data.data.total_rest_days;

            // UI 업데이트 (모달이 열려있을 경우)
            const workDaysInput = document.getElementById('workDaysPerPerson');
            const restDaysInput = document.getElementById('restDaysPerPerson');
            if (workDaysInput) {
                workDaysInput.value = state.workDaysPerPerson;
            }
            if (restDaysInput) {
                restDaysInput.value = state.restDaysPerPerson;
            }

            renderCalendar();
            updateCalendarTitle();
        }
    } catch (error) {
        console.error('달력 정보 로드 실패:', error);
    }
}

function renderCalendar() {
    if (!state.calendarData) return;

    const grid = document.getElementById('calendarGrid');
    const daysHeader = grid.querySelectorAll('p');

    // 기존 날짜 셀 제거
    const cells = grid.querySelectorAll('.calendar-cell');
    cells.forEach(cell => cell.remove());

    const { days, num_days } = state.calendarData;
    const firstDayWeekday = days[0].weekday;

    // 이전 달 빈 칸
    for (let i = 0; i < firstDayWeekday; i++) {
        const emptyCell = createEmptyCell();
        grid.appendChild(emptyCell);
    }

    // 실제 날짜 셀
    for (let i = 0; i < num_days; i++) {
        const day = i + 1;
        const dayData = days[i];
        const cell = createDayCell(day, dayData);
        grid.appendChild(cell);
    }

    // 다음 달 빈 칸
    const totalCells = firstDayWeekday + num_days;
    const remainingCells = 7 - (totalCells % 7);
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            const emptyCell = createEmptyCell();
            grid.appendChild(emptyCell);
        }
    }
}

function createEmptyCell() {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell min-h-[100px] bg-gray-100 border-b border-r border-gray-800';
    return cell;
}

function createDayCell(day, dayData) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell min-h-[100px] border-b border-r border-gray-800 p-2 relative bg-white';

    // 날짜 숫자
    const dateNumber = document.createElement('div');
    dateNumber.className = 'text-right mb-2';

    const dateSpan = document.createElement('span');
    // 일요일 기준: 일(0), 월(1), 화(2), 수(3), 목(4), 금(5), 토(6)
    // 토요일(6) → 파랑, 일요일(0)/공휴일 → 빨강, 평일 → 검정
    if (dayData.weekday === 6) {  // 토요일
        dateSpan.className = 'text-blue-600 font-bold';
    } else if (dayData.weekday === 0 || dayData.is_holiday) {  // 일요일 또는 공휴일
        dateSpan.className = 'text-red-600 font-bold';
    } else {  // 평일
        dateSpan.className = 'text-gray-900 font-bold';
    }
    dateSpan.textContent = day;
    dateNumber.appendChild(dateSpan);

    cell.appendChild(dateNumber);

    // 근무자 표시
    const workersContainer = document.createElement('div');
    workersContainer.className = 'space-y-1 text-xs';

    if (state.schedule[day]) {
        const { dayWorkers, nightWorkers, offbWorkers, offrWorkers } = state.schedule[day];

        // 주간 근무
        if (dayWorkers && dayWorkers.length > 0) {
            dayWorkers.forEach(worker => {
                const badge = document.createElement('div');
                badge.className = 'worker-badge day-worker';
                badge.textContent = `주: ${worker}`;
                workersContainer.appendChild(badge);
            });
        }

        // 야간 근무
        if (nightWorkers && nightWorkers.length > 0) {
            nightWorkers.forEach(worker => {
                const badge = document.createElement('div');
                badge.className = 'worker-badge night-worker';
                badge.textContent = `야: ${worker}`;
                workersContainer.appendChild(badge);
            });
        }

        // 비번 (showOffShifts가 true일 때만 표시)
        if (state.showOffShifts && offbWorkers && offbWorkers.length > 0) {
            offbWorkers.forEach(worker => {
                const badge = document.createElement('div');
                badge.className = 'worker-badge offb-worker';
                badge.style.backgroundColor = '#fbbf24';
                badge.style.color = '#78350f';
                badge.textContent = `비: ${worker}`;
                workersContainer.appendChild(badge);
            });
        }

        // 휴무 (showOffShifts가 true일 때만 표시)
        if (state.showOffShifts && offrWorkers && offrWorkers.length > 0) {
            offrWorkers.forEach(worker => {
                const badge = document.createElement('div');
                badge.className = 'worker-badge offr-worker';
                badge.style.backgroundColor = '#d1d5db';
                badge.style.color = '#374151';
                badge.textContent = `휴: ${worker}`;
                workersContainer.appendChild(badge);
            });
        }
    }

    cell.appendChild(workersContainer);

    // 클릭 이벤트
    cell.addEventListener('click', () => openDayAssignmentModal(day));

    return cell;
}

function updateCalendarTitle() {
    document.getElementById('calendarTitle').textContent =
        `${state.currentYear}년 ${state.currentMonth}월`;
}

function previousMonth() {
    state.currentMonth--;
    if (state.currentMonth < 1) {
        state.currentMonth = 12;
        state.currentYear--;
    }
    loadCalendarInfo(state.currentYear, state.currentMonth);
}

function nextMonth() {
    state.currentMonth++;
    if (state.currentMonth > 12) {
        state.currentMonth = 1;
        state.currentYear++;
    }
    loadCalendarInfo(state.currentYear, state.currentMonth);
}

// ===== 모달 관련 함수 =====

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 1. 근무자관리 모달
function openWorkerManagementModal() {
    document.getElementById('workerCount').value = state.workers.length || 5;
    document.getElementById('workerNames').value = state.workers.join(',');
    document.getElementById('workDaysPerPerson').value = state.workDaysPerPerson;
    document.getElementById('restDaysPerPerson').value = state.restDaysPerPerson;
    openModal('workerManagementModal');
}

function closeWorkerManagementModal() {
    closeModal('workerManagementModal');
}

function increaseWorkerCount() {
    const input = document.getElementById('workerCount');
    if (input.value < 10) input.value = parseInt(input.value) + 1;
}

function decreaseWorkerCount() {
    const input = document.getElementById('workerCount');
    if (input.value > 1) input.value = parseInt(input.value) - 1;
}

function updateWorkerCountDisplay() {
    const workDays = parseInt(document.getElementById('workDaysPerPerson').value) || 20;
    const totalDays = state.calendarData ? state.calendarData.num_days : 30;
    document.getElementById('restDaysPerPerson').value = totalDays - workDays;
}

// workDaysPerPerson 입력 시 자동 계산
document.addEventListener('DOMContentLoaded', function() {
    const workDaysInput = document.getElementById('workDaysPerPerson');
    if (workDaysInput) {
        workDaysInput.addEventListener('input', updateWorkerCountDisplay);
    }
});

function saveWorkerManagement() {
    const namesInput = document.getElementById('workerNames').value.trim();
    state.workers = namesInput.split(',').map(n => n.trim()).filter(n => n);
    state.workDaysPerPerson = parseInt(document.getElementById('workDaysPerPerson').value);
    state.restDaysPerPerson = parseInt(document.getElementById('restDaysPerPerson').value);

    closeWorkerManagementModal();
    updateStatusMessage('근무자 정보가 저장되었습니다.');
}

// 2. 날짜 선택 모달
function openDatePickerModal() {
    document.getElementById('selectedYear').value = state.currentYear;
    document.getElementById('selectedMonth').value = state.currentMonth;
    openModal('datePickerModal');
}

function closeDatePickerModal() {
    closeModal('datePickerModal');
}

function saveDatePicker() {
    const year = parseInt(document.getElementById('selectedYear').value);
    const month = parseInt(document.getElementById('selectedMonth').value);

    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
        alert('올바른 날짜를 입력하세요.');
        return;
    }

    state.currentYear = year;
    state.currentMonth = month;
    loadCalendarInfo(year, month);
    closeDatePickerModal();
}

// 3. 일별 근무자 지정 모달
function openDayAssignmentModal(day) {
    if (state.workers.length === 0) {
        alert('먼저 근무자를 등록해주세요. (상단 "근무자관리" 버튼)');
        return;
    }

    state.selectedDay = day;
    document.getElementById('dayAssignmentTitle').textContent = `${day}일의 근무자를 지정하세요`;

    // 기존 선택 로드
    const daySchedule = state.schedule[day] || { dayWorkers: [], nightWorkers: [], offbWorkers: [], offrWorkers: [] };

    renderWorkerSelects('dayWorkersList', daySchedule.dayWorkers);
    renderWorkerSelects('nightWorkersList', daySchedule.nightWorkers);
    renderWorkerSelects('offbWorkersList', daySchedule.offbWorkers);
    renderWorkerSelects('offrWorkersList', daySchedule.offrWorkers);

    openModal('dayAssignmentModal');
}

function closeDayAssignmentModal() {
    closeModal('dayAssignmentModal');
}

function renderWorkerSelects(containerId, selectedWorkers) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const count = Math.max(1, selectedWorkers.length);

    for (let i = 0; i < count; i++) {
        const select = createWorkerSelect(selectedWorkers[i] || '');
        container.appendChild(select);
    }
}

function createWorkerSelect(selectedWorker) {
    const select = document.createElement('select');
    select.className = 'w-full border-2 border-gray-300 rounded-lg px-4 py-2';

    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '선택하세요';
    select.appendChild(emptyOption);

    state.workers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker;
        option.textContent = worker;
        if (worker === selectedWorker) option.selected = true;
        select.appendChild(option);
    });

    return select;
}

function addDayWorker() {
    const container = document.getElementById('dayWorkersList');
    if (container.children.length < 5) {
        container.appendChild(createWorkerSelect(''));
    }
}

function addNightWorker() {
    const container = document.getElementById('nightWorkersList');
    if (container.children.length < 5) {
        container.appendChild(createWorkerSelect(''));
    }
}

function addOffBWorker() {
    const container = document.getElementById('offbWorkersList');
    if (container.children.length < 5) {
        container.appendChild(createWorkerSelect(''));
    }
}

function addOffRWorker() {
    const container = document.getElementById('offrWorkersList');
    if (container.children.length < 5) {
        container.appendChild(createWorkerSelect(''));
    }
}

function saveDayAssignment() {
    const day = state.selectedDay;

    const dayWorkers = getSelectedWorkers('dayWorkersList');
    const nightWorkers = getSelectedWorkers('nightWorkersList');
    const offbWorkers = getSelectedWorkers('offbWorkersList');
    const offrWorkers = getSelectedWorkers('offrWorkersList');

    state.schedule[day] = { dayWorkers, nightWorkers, offbWorkers, offrWorkers };

    renderCalendar();
    closeDayAssignmentModal();
    updateStatusMessage(`${day}일 근무자가 지정되었습니다.`);
}

function getSelectedWorkers(containerId) {
    const container = document.getElementById(containerId);
    const selects = container.querySelectorAll('select');
    const workers = [];

    selects.forEach(select => {
        if (select.value) workers.push(select.value);
    });

    return workers;
}

// 4. 상세조회 모달
function openDetailedInquiryModal() {
    openModal('detailedInquiryModal');
}

function closeDetailedInquiryModal() {
    closeModal('detailedInquiryModal');
}

// 5. 요분리근무자 모달
function openSeparateWorkersModal() {
    if (state.workers.length < 2) {
        alert('근무자가 2명 이상 등록되어야 합니다.');
        return;
    }

    renderSeparateWorkersList();
    closeDetailedInquiryModal();
    openModal('separateWorkersModal');
}

function closeSeparateWorkersModal() {
    closeModal('separateWorkersModal');
}

function renderSeparateWorkersList() {
    const container = document.getElementById('separateWorkersList');
    container.innerHTML = '';

    state.workers.forEach((worker, index) => {
        const checkbox = document.createElement('label');
        checkbox.className = 'flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = worker;
        input.className = 'w-5 h-5 text-primary';

        // 이미 선택된 경우 체크
        const isSelected = state.separateWorkerPairs.some(pair =>
            pair.includes(worker)
        );
        if (isSelected) input.checked = true;

        const label = document.createElement('span');
        label.textContent = worker;

        checkbox.appendChild(input);
        checkbox.appendChild(label);
        container.appendChild(checkbox);
    });
}

function saveSeparateWorkers() {
    const container = document.getElementById('separateWorkersList');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');

    const selectedWorkers = Array.from(checkboxes).map(cb => cb.value);

    // 선택된 근무자들을 페어로 저장 (맨 밑 두 명 규칙)
    if (selectedWorkers.length >= 2) {
        state.separateWorkerPairs = [[selectedWorkers[selectedWorkers.length - 2], selectedWorkers[selectedWorkers.length - 1]]];
    }

    closeSeparateWorkersModal();
    updateStatusMessage('요분리근무자가 설정되었습니다.');
}

// 6. 근무배치 현황요약 모달
function openScheduleSummaryModal() {
    if (Object.keys(state.schedule).length === 0) {
        alert('먼저 근무표를 작성하거나 자동배치를 실행하세요.');
        return;
    }

    renderScheduleSummary();
    closeDetailedInquiryModal();
    openModal('scheduleSummaryModal');
}

function closeScheduleSummaryModal() {
    closeModal('scheduleSummaryModal');
}

function renderScheduleSummary() {
    const container = document.getElementById('summaryTableContainer');

    // 백엔드 통계가 있으면 사용, 없으면 프론트엔드 계산
    let stats;

    if (state.lastResult && state.lastResult.statistics && state.lastResult.statistics.employee_stats) {
        // 백엔드 통계 사용 (정확함!)
        const backendStats = state.lastResult.statistics.employee_stats;
        stats = {};

        backendStats.forEach(empStat => {
            const totalWork = empStat.day + empStat.night + empStat.offb;
            const totalRest = empStat.offr;

            stats[empStat.name] = {
                day: empStat.day,
                night: empStat.night,
                offb: empStat.offb,
                offr: empStat.offr,
                total_work: totalWork,
                total_rest: totalRest,
                multi: 0  // 2인이상은 프론트엔드에서 계산
            };
        });

        // 2인 이상 근무 계산
        Object.keys(state.schedule).forEach(day => {
            const { dayWorkers, nightWorkers } = state.schedule[day];

            if (dayWorkers && dayWorkers.length >= 2) {
                dayWorkers.forEach(worker => {
                    if (stats[worker]) stats[worker].multi++;
                });
            }

            if (nightWorkers && nightWorkers.length >= 2) {
                nightWorkers.forEach(worker => {
                    if (stats[worker]) stats[worker].multi++;
                });
            }
        });

    } else {
        // 백엔드 데이터 없을 때만 프론트엔드 계산
        stats = {};
        state.workers.forEach(worker => {
            stats[worker] = {
                day: 0,
                night: 0,
                offb: 0,
                offr: 0,
                total_work: 0,
                total_rest: 0,
                multi: 0
            };
        });

        // 근무 카운트
        Object.keys(state.schedule).forEach(day => {
            const { dayWorkers, nightWorkers, offbWorkers, offrWorkers } = state.schedule[day];

            if (dayWorkers) {
                dayWorkers.forEach(worker => {
                    if (stats[worker]) {
                        stats[worker].day++;
                        if (dayWorkers.length >= 2) stats[worker].multi++;
                    }
                });
            }

            if (nightWorkers) {
                nightWorkers.forEach(worker => {
                    if (stats[worker]) {
                        stats[worker].night++;
                        if (nightWorkers.length >= 2) stats[worker].multi++;
                    }
                });
            }

            if (offbWorkers) {
                offbWorkers.forEach(worker => {
                    if (stats[worker]) stats[worker].offb++;
                });
            }

            if (offrWorkers) {
                offrWorkers.forEach(worker => {
                    if (stats[worker]) stats[worker].offr++;
                });
            }
        });

        // 총계 계산
        Object.keys(stats).forEach(worker => {
            const s = stats[worker];
            s.total_work = s.day + s.night + s.offb;
            s.total_rest = s.offr;
        });
    }

    // 테이블 생성
    let html = `
        <table class="min-w-full border-collapse border border-gray-300">
            <thead>
                <tr class="bg-gray-100 dark:bg-gray-700">
                    <th class="border border-gray-300 px-4 py-2">근무자</th>
                    <th class="border border-gray-300 px-4 py-2">주간</th>
                    <th class="border border-gray-300 px-4 py-2">야간</th>
                    <th class="border border-gray-300 px-4 py-2">비번</th>
                    <th class="border border-gray-300 px-4 py-2">휴일</th>
                    <th class="border border-gray-300 px-4 py-2">총 근무</th>
                    <th class="border border-gray-300 px-4 py-2">총 휴일</th>
                    <th class="border border-gray-300 px-4 py-2">2인이상</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.keys(stats).forEach(worker => {
        const s = stats[worker];
        html += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="border border-gray-300 px-4 py-2 font-medium">${worker}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${s.day}일</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${s.night}일</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${s.offb}일</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${s.offr}일</td>
                <td class="border border-gray-300 px-4 py-2 text-center font-semibold">${s.total_work}일</td>
                <td class="border border-gray-300 px-4 py-2 text-center font-semibold">${s.total_rest}일</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${s.multi}일</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// ===== 자동배치 함수 =====

async function automaticAssignment() {
    if (state.workers.length < 2) {
        alert('먼저 근무자를 등록해주세요. (상단 "근무자관리" 버튼)');
        return;
    }

    if (!state.calendarData) {
        alert('달력 정보를 먼저 불러와주세요.');
        return;
    }

    // 로딩 표시
    openModal('loadingSpinner');

    try {
        // 고정 근무 변환
        const fixedShifts = [];
        Object.keys(state.schedule).forEach(day => {
            const { dayWorkers, nightWorkers } = state.schedule[day];

            dayWorkers.forEach(worker => {
                const empIdx = state.workers.indexOf(worker);
                if (empIdx !== -1) {
                    fixedShifts.push({
                        employee_idx: empIdx,
                        day: parseInt(day) - 1,  // 0-based
                        shift_type: 0  // DAY
                    });
                }
            });

            nightWorkers.forEach(worker => {
                const empIdx = state.workers.indexOf(worker);
                if (empIdx !== -1) {
                    fixedShifts.push({
                        employee_idx: empIdx,
                        day: parseInt(day) - 1,  // 0-based
                        shift_type: 1  // NIGHT
                    });
                }
            });
        });

        const response = await fetch('/api/generate_schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                year: state.currentYear,
                month: state.currentMonth,
                employees: state.workers,
                work_days: state.workDaysPerPerson,
                fixed_shifts: fixedShifts
            })
        });

        const data = await response.json();

        closeModal('loadingSpinner');

        if (data.success) {
            // 결과 전체를 저장
            state.lastResult = data.result;

            // 결과를 state.schedule에 반영
            applyAutoSchedule(data.result.schedule);
            renderCalendar();
            updateStatusMessage('자동 배치가 완료되었습니다!');

            // 콘솔에 통계 출력 (디버깅용)
            console.log('백엔드 통계:', data.result.statistics);
        } else {
            alert(data.error);
        }

    } catch (error) {
        closeModal('loadingSpinner');
        alert('자동 배치 중 오류가 발생했습니다: ' + error.message);
    }
}

function applyAutoSchedule(schedule) {
    state.schedule = {};

    schedule.forEach(emp => {
        emp.shifts.forEach(shift => {
            const day = shift.day;

            if (!state.schedule[day]) {
                state.schedule[day] = {
                    dayWorkers: [],
                    nightWorkers: [],
                    offbWorkers: [],
                    offrWorkers: []
                };
            }

            // ShiftType: DAY=0, NIGHT=1, OFF_B=2, OFF_R=3
            if (shift.type === 0) {  // DAY
                state.schedule[day].dayWorkers.push(emp.name);
            } else if (shift.type === 1) {  // NIGHT
                state.schedule[day].nightWorkers.push(emp.name);
            } else if (shift.type === 2) {  // OFF_B (비번)
                state.schedule[day].offbWorkers.push(emp.name);
            } else if (shift.type === 3) {  // OFF_R (휴무)
                state.schedule[day].offrWorkers.push(emp.name);
            }
        });
    });
}

// ===== 유틸리티 함수 =====

function updateStatusMessage(message) {
    const statusDiv = document.getElementById('statusMessage');
    if (Object.keys(state.schedule).length > 0) {
        statusDiv.style.display = 'none';
    } else {
        statusDiv.style.display = 'block';
    }
}

function toggleOffShiftsVisibility() {
    state.showOffShifts = !state.showOffShifts;

    // 버튼 텍스트 업데이트
    const buttonText = document.getElementById('toggleOffShiftsText');
    buttonText.textContent = state.showOffShifts ? '비/휴 숨기기' : '비/휴 보기';

    // 달력 다시 렌더링
    renderCalendar();
}

// ===== 시간표확인 기능 =====

function openScheduleTableModal() {
    if (!state.lastResult || !state.lastResult.schedule) {
        alert('먼저 근무표를 생성해주세요.');
        return;
    }

    renderScheduleTable();
    openModal('scheduleTableModal');
}

function closeScheduleTableModal() {
    closeModal('scheduleTableModal');
}

function renderScheduleTable() {
    const container = document.getElementById('scheduleTableContainer');
    const schedule = state.lastResult.schedule;
    const numDays = state.calendarData ? state.calendarData.num_days : 30;

    // 테이블 생성
    let html = '<table class="min-w-full border-collapse border-2 border-gray-800" style="font-size: 14px;">';

    // 헤더 행
    html += '<thead><tr class="bg-gray-200">';
    html += '<th class="border-2 border-gray-800 px-3 py-2 font-black text-gray-900 sticky left-0 bg-gray-200 z-10">근무자</th>';
    for (let day = 1; day <= numDays; day++) {
        html += `<th class="border-2 border-gray-800 px-2 py-2 font-bold text-gray-900 min-w-[40px]">${day}</th>`;
    }
    html += '</tr></thead>';

    // 데이터 행
    html += '<tbody>';
    schedule.forEach((employee, idx) => {
        html += '<tr class="' + (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50') + '">';
        html += `<td class="border-2 border-gray-800 px-3 py-2 font-bold text-gray-900 sticky left-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} z-10">${employee.name}</td>`;

        // 각 날짜별 근무 타입
        for (let day = 1; day <= numDays; day++) {
            const shift = employee.shifts.find(s => s.day === day);
            let shiftText = '';
            let bgColor = '';
            let textColor = 'text-white';

            if (shift) {
                // ShiftType: DAY=0, NIGHT=1, OFF_B=2, OFF_R=3
                if (shift.type === 0) {
                    shiftText = '주';
                    bgColor = 'bg-blue-500';
                } else if (shift.type === 1) {
                    shiftText = '야';
                    bgColor = 'bg-purple-600';
                } else if (shift.type === 2) {
                    shiftText = '비';
                    bgColor = 'bg-yellow-400';
                    textColor = 'text-yellow-900';
                } else if (shift.type === 3) {
                    shiftText = '휴';
                    bgColor = 'bg-gray-300';
                    textColor = 'text-gray-700';
                }
            }

            html += `<td class="border-2 border-gray-800 px-2 py-2 text-center font-bold ${bgColor} ${textColor}">${shiftText}</td>`;
        }

        html += '</tr>';
    });
    html += '</tbody>';
    html += '</table>';

    container.innerHTML = html;
}

async function downloadScheduleTable() {
    const container = document.getElementById('scheduleTableContainer');

    try {
        // html2canvas로 스크린샷 생성
        const canvas = await html2canvas(container, {
            scale: 2, // 고해상도
            backgroundColor: '#ffffff',
            logging: false
        });

        // 이미지로 변환
        const image = canvas.toDataURL('image/png');

        // 다운로드 링크 생성
        const link = document.createElement('a');
        const filename = `근무시간표_${state.currentYear}년${state.currentMonth}월.png`;
        link.download = filename;
        link.href = image;
        link.click();

        alert('시간표가 저장되었습니다!');
    } catch (error) {
        console.error('스크린샷 저장 실패:', error);
        alert('스크린샷 저장에 실패했습니다.');
    }
}

// ===== 저장/불러오기 기능 =====

function checkAndSave() {
    if (!state.lastResult || !state.lastResult.schedule) {
        alert('저장할 근무표가 없습니다. 먼저 근무표를 생성해주세요.');
        return;
    }

    // 이미 저장된 적이 있으면 저장 옵션 모달 표시
    if (state.currentSaveKey) {
        openSaveOptionsModal();
    } else {
        // 처음 저장하는 경우 바로 다른 이름으로 저장
        saveSchedule(true);
    }
}

function openSaveOptionsModal() {
    openModal('saveOptionsModal');
}

function closeSaveOptionsModal() {
    closeModal('saveOptionsModal');
}

function saveSchedule(saveAs) {
    let saveKey = state.currentSaveKey;

    if (saveAs || !saveKey) {
        // 다른 이름으로 저장
        const saveName = prompt('저장 이름을 입력하세요:', `${state.currentYear}년${state.currentMonth}월_근무표`);
        if (!saveName) {
            closeSaveOptionsModal();
            return;
        }
        saveKey = `schedule_${saveName}`;
    }

    // 저장할 데이터
    const saveData = {
        year: state.currentYear,
        month: state.currentMonth,
        workers: state.workers,
        workDaysPerPerson: state.workDaysPerPerson,
        restDaysPerPerson: state.restDaysPerPerson,
        schedule: state.schedule,
        separateWorkerPairs: state.separateWorkerPairs,
        lastResult: state.lastResult,
        savedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        state.currentSaveKey = saveKey;

        // 저장 목록 업데이트 (최근 저장 추적)
        updateSaveList(saveKey);

        alert('근무표가 저장되었습니다!');
        closeSaveOptionsModal();

        // 시간표 이미지도 자동 저장
        saveScheduleImage(saveKey);
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다. 저장 공간을 확인해주세요.');
    }
}

function updateSaveList(saveKey) {
    let saveList = JSON.parse(localStorage.getItem('scheduleList') || '[]');
    if (!saveList.includes(saveKey)) {
        saveList.unshift(saveKey);
    }
    localStorage.setItem('scheduleList', JSON.stringify(saveList));
}

async function saveScheduleImage(saveKey) {
    // 시간표 이미지도 함께 저장
    if (!state.lastResult || !state.lastResult.schedule) return;

    try {
        // 임시로 시간표 렌더링
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = renderScheduleTableHTML();
        document.body.appendChild(tempContainer);

        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });

        const imageData = canvas.toDataURL('image/png');
        localStorage.setItem(`${saveKey}_image`, imageData);

        document.body.removeChild(tempContainer);
    } catch (error) {
        console.error('이미지 저장 실패:', error);
    }
}

function renderScheduleTableHTML() {
    const schedule = state.lastResult.schedule;
    const numDays = state.calendarData ? state.calendarData.num_days : 30;

    let html = '<div style="background: white; padding: 20px;">';
    html += '<table class="min-w-full border-collapse border-2 border-gray-800" style="font-size: 14px;">';
    html += '<thead><tr class="bg-gray-200">';
    html += '<th class="border-2 border-gray-800 px-3 py-2 font-black text-gray-900">근무자</th>';
    for (let day = 1; day <= numDays; day++) {
        html += `<th class="border-2 border-gray-800 px-2 py-2 font-bold text-gray-900">${day}</th>`;
    }
    html += '</tr></thead><tbody>';

    schedule.forEach((employee, idx) => {
        html += `<tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
        html += `<td class="border-2 border-gray-800 px-3 py-2 font-bold text-gray-900">${employee.name}</td>`;

        for (let day = 1; day <= numDays; day++) {
            const shift = employee.shifts.find(s => s.day === day);
            let shiftText = '';
            let bgColor = '';

            if (shift) {
                if (shift.type === 0) { shiftText = '주'; bgColor = 'background: #3b82f6; color: white;'; }
                else if (shift.type === 1) { shiftText = '야'; bgColor = 'background: #8b5cf6; color: white;'; }
                else if (shift.type === 2) { shiftText = '비'; bgColor = 'background: #fbbf24; color: #78350f;'; }
                else if (shift.type === 3) { shiftText = '휴'; bgColor = 'background: #d1d5db; color: #374151;'; }
            }

            html += `<td class="border-2 border-gray-800 px-2 py-2 text-center font-bold" style="${bgColor}">${shiftText}</td>`;
        }
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
}

function openLoadModal() {
    renderSavedSchedulesList();
    openModal('loadModal');
}

function closeLoadModal() {
    closeModal('loadModal');
}

function renderSavedSchedulesList() {
    const container = document.getElementById('savedSchedulesList');
    const saveList = JSON.parse(localStorage.getItem('scheduleList') || '[]');

    if (saveList.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">저장된 근무표가 없습니다.</p>';
        return;
    }

    let html = '';
    saveList.forEach(saveKey => {
        const data = JSON.parse(localStorage.getItem(saveKey) || 'null');
        if (!data) return;

        const saveName = saveKey.replace('schedule_', '');
        const savedDate = new Date(data.savedAt).toLocaleString('ko-KR');

        html += `
            <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-900 dark:text-white">${saveName}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${data.year}년 ${data.month}월 | ${data.workers.length}명</p>
                        <p class="text-xs text-gray-500 dark:text-gray-500">저장: ${savedDate}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="loadSchedule('${saveKey}')" class="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">
                            불러오기
                        </button>
                        <button onclick="deleteSchedule('${saveKey}')" class="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm">
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function loadSchedule(saveKey) {
    try {
        const data = JSON.parse(localStorage.getItem(saveKey));
        if (!data) {
            alert('저장된 데이터를 찾을 수 없습니다.');
            return;
        }

        // 상태 복원
        state.currentYear = data.year;
        state.currentMonth = data.month;
        state.workers = data.workers;
        state.workDaysPerPerson = data.workDaysPerPerson;
        state.restDaysPerPerson = data.restDaysPerPerson;
        state.schedule = data.schedule;
        state.separateWorkerPairs = data.separateWorkerPairs || [];
        state.lastResult = data.lastResult;
        state.currentSaveKey = saveKey;

        // 이전달 데이터 연동 확인
        checkAndLinkPreviousMonth();

        // UI 업데이트
        loadCalendarInfo(state.currentYear, state.currentMonth);
        updateWorkerCountDisplay();
        renderCalendar();

        closeLoadModal();
        alert('근무표를 불러왔습니다!');
    } catch (error) {
        console.error('불러오기 실패:', error);
        alert('불러오기에 실패했습니다.');
    }
}

function deleteSchedule(saveKey) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
        localStorage.removeItem(saveKey);
        localStorage.removeItem(`${saveKey}_image`);

        // 목록에서 제거
        let saveList = JSON.parse(localStorage.getItem('scheduleList') || '[]');
        saveList = saveList.filter(key => key !== saveKey);
        localStorage.setItem('scheduleList', JSON.stringify(saveList));

        renderSavedSchedulesList();
        alert('삭제되었습니다.');
    } catch (error) {
        console.error('삭제 실패:', error);
        alert('삭제에 실패했습니다.');
    }
}

function checkAndLinkPreviousMonth() {
    // 이전달 데이터 찾기
    let prevYear = state.currentYear;
    let prevMonth = state.currentMonth - 1;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
    }

    // 저장된 목록에서 이전달 데이터 찾기
    const saveList = JSON.parse(localStorage.getItem('scheduleList') || '[]');
    let prevMonthData = null;

    for (const saveKey of saveList) {
        const data = JSON.parse(localStorage.getItem(saveKey) || 'null');
        if (data && data.year === prevYear && data.month === prevMonth) {
            prevMonthData = data;
            break;
        }
    }

    if (!prevMonthData) {
        console.log('이전달 데이터가 없습니다.');
        return;
    }

    // 이전달 말일 야간근무자 찾기
    const prevMonthSchedule = prevMonthData.lastResult?.schedule;
    if (!prevMonthSchedule) return;

    const lastDay = prevMonthData.calendarData?.num_days || 30;
    const nightWorkersLastDay = [];

    prevMonthSchedule.forEach(employee => {
        const lastDayShift = employee.shifts.find(s => s.day === lastDay);
        if (lastDayShift && lastDayShift.type === 1) { // NIGHT
            nightWorkersLastDay.push(employee.name);
        }
    });

    if (nightWorkersLastDay.length === 0) {
        console.log('이전달 말일에 야간근무자가 없습니다.');
        return;
    }

    // 현재달 1일에 비번 추가 (수동으로만, 자동배치는 제약 유지)
    console.log(`이전달 말일 야간근무자: ${nightWorkersLastDay.join(', ')}`);
    console.log('이번달 1일에 비번으로 추가됩니다 (수동 입력 권장).');

    // 자동으로 1일 스케줄에 추가
    if (!state.schedule[1]) {
        state.schedule[1] = { dayWorkers: [], nightWorkers: [], offbWorkers: [], offrWorkers: [] };
    }

    nightWorkersLastDay.forEach(worker => {
        if (!state.schedule[1].offbWorkers.includes(worker)) {
            state.schedule[1].offbWorkers.push(worker);
        }
    });

    alert(`이전달(${prevYear}년 ${prevMonth}월) 말일 야간근무자 ${nightWorkersLastDay.length}명을 1일 비번으로 추가했습니다.`);
}
