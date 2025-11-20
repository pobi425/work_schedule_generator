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
    lastResult: null  // 백엔드에서 받은 전체 결과 저장
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
    cell.className = 'min-h-[100px] bg-background-light dark:bg-gray-900 border-b border-r border-[#dbdfe6] dark:border-gray-700';
    return cell;
}

function createDayCell(day, dayData) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell min-h-[100px] border-b border-r border-[#dbdfe6] dark:border-gray-700 p-2 relative';

    // 날짜 숫자
    const dateNumber = document.createElement('div');
    dateNumber.className = 'text-right mb-2';

    const dateSpan = document.createElement('span');
    dateSpan.className = dayData.is_weekend
        ? 'text-red-500 font-semibold'
        : 'text-[#333333] dark:text-gray-300';
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

        // 비번
        if (offbWorkers && offbWorkers.length > 0) {
            offbWorkers.forEach(worker => {
                const badge = document.createElement('div');
                badge.className = 'worker-badge offb-worker';
                badge.style.backgroundColor = '#fbbf24';
                badge.style.color = '#78350f';
                badge.textContent = `비: ${worker}`;
                workersContainer.appendChild(badge);
            });
        }

        // 휴무
        if (offrWorkers && offrWorkers.length > 0) {
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
    const daySchedule = state.schedule[day] || { dayWorkers: [], nightWorkers: [] };

    renderWorkerSelects('dayWorkersList', daySchedule.dayWorkers);
    renderWorkerSelects('nightWorkersList', daySchedule.nightWorkers);

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
    if (container.children.length < 3) {
        container.appendChild(createWorkerSelect(''));
    }
}

function addNightWorker() {
    const container = document.getElementById('nightWorkersList');
    if (container.children.length < 3) {
        container.appendChild(createWorkerSelect(''));
    }
}

function saveDayAssignment() {
    const day = state.selectedDay;

    const dayWorkers = getSelectedWorkers('dayWorkersList');
    const nightWorkers = getSelectedWorkers('nightWorkersList');

    state.schedule[day] = { dayWorkers, nightWorkers };

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
