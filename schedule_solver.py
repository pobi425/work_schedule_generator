"""
OR-Tools CP-SAT 기반 근무표 생성 솔버
"""

from ortools.sat.python import cp_model
import calendar
from datetime import datetime
from typing import List, Dict, Tuple, Optional


class ShiftType:
    """근무 유형 정의"""
    DAY = 0      # 주간
    NIGHT = 1    # 야간
    OFF_B = 2    # 비번/익일휴무
    OFF_R = 3    # 휴무

    NAMES = ['DAY', 'NIGHT', 'OFF_B', 'OFF_R']
    SYMBOLS = ['D', 'N', 'B', 'R']
    FULL_NAMES = ['주간', '야간', '비번', '휴무']

    @staticmethod
    def get_name(shift_type: int) -> str:
        return ShiftType.NAMES[shift_type]

    @staticmethod
    def get_symbol(shift_type: int) -> str:
        return ShiftType.SYMBOLS[shift_type]

    @staticmethod
    def get_full_name(shift_type: int) -> str:
        return ShiftType.FULL_NAMES[shift_type]


class WorkScheduleConfig:
    """근무표 설정"""
    def __init__(self, year: int, month: int, employees: List[str],
                 work_days: int = 20, fixed_shifts: List[Dict] = None):
        self.year = year
        self.month = month
        self.employees = employees
        self.num_employees = len(employees)

        # 해당 월의 일수 자동 계산
        self.num_days = calendar.monthrange(year, month)[1]

        # 1일의 요일 (0=월요일, 6=일요일)
        self.first_day_weekday = calendar.monthrange(year, month)[0]

        # 말일의 요일
        last_day = datetime(year, month, self.num_days)
        self.last_day_weekday = last_day.weekday()

        # 근무-휴일 비율
        self.work_days = work_days  # 실질 근무일수 (DAY + NIGHT + OFF_B)
        self.rest_days = self.num_days - self.work_days  # 순수 휴일 (OFF_R)

        # 고정 근무 (특정 인원/날짜/근무 지정)
        self.fixed_shifts: List[Dict] = fixed_shifts or []

    def get_info(self) -> Dict:
        """설정 정보를 딕셔너리로 반환"""
        return {
            'year': self.year,
            'month': self.month,
            'num_days': self.num_days,
            'first_day_weekday': calendar.day_name[self.first_day_weekday],
            'last_day_weekday': calendar.day_name[self.last_day_weekday],
            'num_employees': self.num_employees,
            'employees': self.employees,
            'work_days': self.work_days,
            'rest_days': self.rest_days,
            'fixed_shifts': self.fixed_shifts
        }


class WorkScheduleSolver:
    """근무표 솔버"""

    def __init__(self, config: WorkScheduleConfig):
        self.config = config
        self.model = cp_model.CpModel()
        self.shifts = {}
        self.solver = cp_model.CpSolver()
        self.status = None

        # Soft constraint 위반 카운트 변수들
        self.consecutive_5plus_violations = []
        self.offb_to_offr_bonuses = []
        self.day_imbalance_vars = []
        self.night_imbalance_vars = []
        self.night_priority_vars = []  # 야간 >= 주간 강제

    def create_variables(self):
        """의사결정 변수 생성"""
        # shifts[i, d, s]: 직원 i가 날짜 d에 근무 유형 s를 하는지 여부
        for i in range(self.config.num_employees):
            for d in range(self.config.num_days):
                for s in range(4):
                    self.shifts[(i, d, s)] = self.model.NewBoolVar(
                        f'shift_e{i}_d{d}_s{ShiftType.get_name(s)}'
                    )

    def add_hard_constraints(self):
        """필수 제약 조건 추가"""
        # 1. 각 직원은 매일 정확히 하나의 근무 유형만 가짐
        for i in range(self.config.num_employees):
            for d in range(self.config.num_days):
                self.model.Add(
                    sum(self.shifts[(i, d, s)] for s in range(4)) == 1
                )

        # 2. 근무일수 계산 및 총 일수 준수
        for i in range(self.config.num_employees):
            # 실질 근무일수 (DAY + NIGHT + OFF_B) = work_days
            work_shifts = sum(
                self.shifts[(i, d, s)]
                for d in range(self.config.num_days)
                for s in [ShiftType.DAY, ShiftType.NIGHT, ShiftType.OFF_B]
            )
            self.model.Add(work_shifts == self.config.work_days)

            # 순수 휴일 (OFF_R) = rest_days
            rest_shifts = sum(
                self.shifts[(i, d, ShiftType.OFF_R)]
                for d in range(self.config.num_days)
            )
            self.model.Add(rest_shifts == self.config.rest_days)

        # 3. NIGHT 근무 다음 날은 반드시 OFF_B (양방향 제약)
        for i in range(self.config.num_employees):
            for d in range(self.config.num_days - 1):
                # NIGHT(d) → OFF_B(d+1)
                self.model.Add(
                    self.shifts[(i, d+1, ShiftType.OFF_B)] >= self.shifts[(i, d, ShiftType.NIGHT)]
                )

            # OFF_B는 전날 NIGHT가 있었을 때만 가능
            for d in range(self.config.num_days):
                if d == 0:
                    # 1일에 OFF_B 허용하지 않음 (전월 데이터 없음)
                    self.model.Add(self.shifts[(i, d, ShiftType.OFF_B)] == 0)
                else:
                    # OFF_B(d) → NIGHT(d-1)
                    self.model.Add(
                        self.shifts[(i, d, ShiftType.OFF_B)] <= self.shifts[(i, d-1, ShiftType.NIGHT)]
                    )

        # 4. 최대 연속 근무 6일 (7일 이상 금지)
        for i in range(self.config.num_employees):
            for d in range(self.config.num_days - 6):
                # 7일 연속 실질 근무 금지
                work_in_7days = sum(
                    self.shifts[(i, d+k, s)]
                    for k in range(7)
                    for s in [ShiftType.DAY, ShiftType.NIGHT, ShiftType.OFF_B]
                )
                # 7일 중 최소 1일은 OFF_R이어야 함
                self.model.Add(work_in_7days <= 6)

        # 5. 모든 날짜에 최소 인원 (야간 우선 증원, 최대 제한 없음)
        for d in range(self.config.num_days):
            day_count = sum(self.shifts[(i, d, ShiftType.DAY)] for i in range(self.config.num_employees))
            night_count = sum(self.shifts[(i, d, ShiftType.NIGHT)] for i in range(self.config.num_employees))

            # 최소: 주간 1명, 야간 1명
            self.model.Add(day_count >= 1)
            self.model.Add(night_count >= 1)

            # 야간 우선 증원: 야간 >= 주간 (soft constraint는 아래에서)
            # 최대 제한은 없음 (인원이 8명뿐이라 자연스럽게 제한됨)

        # 7. 고정 근무 (지정 날짜 근무)
        for fixed_shift in self.config.fixed_shifts:
            emp_idx = fixed_shift['employee_idx']
            day = fixed_shift['day']
            shift_type = fixed_shift['shift_type']
            self.model.Add(self.shifts[(emp_idx, day, shift_type)] == 1)

    def add_soft_constraints(self):
        """형평성 및 최적화 목표 추가"""
        # 1. 연속 근무 5일 이상 최소화
        for i in range(self.config.num_employees):
            for d in range(self.config.num_days - 4):
                consecutive_5 = self.model.NewBoolVar(f'consecutive_5_e{i}_d{d}')
                work_in_5days = sum(
                    self.shifts[(i, d+k, s)]
                    for k in range(5)
                    for s in [ShiftType.DAY, ShiftType.NIGHT, ShiftType.OFF_B]
                )
                self.model.Add(work_in_5days == 5).OnlyEnforceIf(consecutive_5)
                self.model.Add(work_in_5days < 5).OnlyEnforceIf(consecutive_5.Not())
                self.consecutive_5plus_violations.append(consecutive_5)

        # 2. OFF_B 다음 날 OFF_R 권장
        for i in range(self.config.num_employees):
            for d in range(self.config.num_days - 1):
                offb_to_offr = self.model.NewBoolVar(f'offb_to_offr_e{i}_d{d}')
                self.model.AddMultiplicationEquality(
                    offb_to_offr,
                    [self.shifts[(i, d, ShiftType.OFF_B)], self.shifts[(i, d+1, ShiftType.OFF_R)]]
                )
                self.offb_to_offr_bonuses.append(offb_to_offr)

        # 2-1. 야간 우선 증원 (야간 >= 주간 강제)
        for d in range(self.config.num_days):
            day_count_d = sum(self.shifts[(i, d, ShiftType.DAY)] for i in range(self.config.num_employees))
            night_count_d = sum(self.shifts[(i, d, ShiftType.NIGHT)] for i in range(self.config.num_employees))

            # 야간 - 주간 차이 (양수면 야간이 더 많음, 음수면 주간이 더 많음)
            night_advantage = self.model.NewIntVar(-self.config.num_employees, self.config.num_employees, f'night_adv_d{d}')
            self.model.Add(night_advantage == night_count_d - day_count_d)

            # 야간이 주간보다 적으면 페널티 (야간 >= 주간 선호)
            night_deficit = self.model.NewIntVar(0, self.config.num_employees, f'night_deficit_d{d}')
            self.model.AddMaxEquality(night_deficit, [0, -night_advantage])  # max(0, -(night-day))
            self.night_priority_vars.append(night_deficit)

        # 3. DAY, NIGHT 근무 균등 분배 (강력한 제약)
        day_counts = []
        night_counts = []

        for i in range(self.config.num_employees):
            day_count = sum(self.shifts[(i, d, ShiftType.DAY)] for d in range(self.config.num_days))
            night_count = sum(self.shifts[(i, d, ShiftType.NIGHT)] for d in range(self.config.num_days))
            day_counts.append(day_count)
            night_counts.append(night_count)

        # 최대/최소 근무 횟수 변수
        max_day_count = self.model.NewIntVar(0, self.config.num_days, 'max_day_count')
        min_day_count = self.model.NewIntVar(0, self.config.num_days, 'min_day_count')
        max_night_count = self.model.NewIntVar(0, self.config.num_days, 'max_night_count')
        min_night_count = self.model.NewIntVar(0, self.config.num_days, 'min_night_count')

        # 모든 직원의 근무 횟수가 최대/최소 범위 내
        for i in range(self.config.num_employees):
            self.model.Add(day_counts[i] <= max_day_count)
            self.model.Add(day_counts[i] >= min_day_count)
            self.model.Add(night_counts[i] <= max_night_count)
            self.model.Add(night_counts[i] >= min_night_count)

        # 주간/야간 근무 횟수 차이 최대 2일 이내 (hard constraint)
        self.model.Add(max_day_count - min_day_count <= 2)
        self.model.Add(max_night_count - min_night_count <= 2)

        # Soft constraint: 차이를 더욱 최소화
        day_diff = self.model.NewIntVar(0, self.config.num_days, 'day_diff')
        night_diff = self.model.NewIntVar(0, self.config.num_days, 'night_diff')
        self.model.Add(day_diff == max_day_count - min_day_count)
        self.model.Add(night_diff == max_night_count - min_night_count)
        self.day_imbalance_vars.append(day_diff)
        self.night_imbalance_vars.append(night_diff)

    def set_objective(self):
        """목표 함수 설정"""
        objective_terms = []

        # 1. 연속 5일 이상 근무 최소화 (가중치: 높음)
        objective_terms.extend([v * 100 for v in self.consecutive_5plus_violations])

        # 2. OFF_B → OFF_R 최대화 (음수로 추가)
        objective_terms.extend([-v * 50 for v in self.offb_to_offr_bonuses])

        # 2-1. 야간 우선 증원 (야간 >= 주간 강제, 매우 높은 가중치)
        objective_terms.extend([v * 500 for v in self.night_priority_vars])

        # 3. DAY/NIGHT 균등 분배 (높은 가중치)
        objective_terms.extend([v * 200 for v in self.day_imbalance_vars])
        objective_terms.extend([v * 200 for v in self.night_imbalance_vars])

        self.model.Minimize(sum(objective_terms))

    def solve(self, max_time_seconds: int = 120) -> Tuple[str, Optional[Dict]]:
        """
        모델 해결

        Returns:
            (status_name, result_dict or None)
        """
        # 변수 생성
        self.create_variables()

        # 제약 조건 추가
        self.add_hard_constraints()
        self.add_soft_constraints()

        # 목표 함수 설정
        self.set_objective()

        # 솔버 옵션 설정
        self.solver.parameters.max_time_in_seconds = float(max_time_seconds)

        # 해결
        self.status = self.solver.Solve(self.model)
        status_name = self.solver.StatusName(self.status)

        if self.status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return status_name, self.extract_solution()
        else:
            return status_name, None

    def extract_solution(self) -> Dict:
        """해답 추출"""
        if self.status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return None

        schedule = []
        statistics = {
            'daily_coverage': [],
            'employee_stats': []
        }

        # 각 직원별 근무표 추출
        for i, emp_name in enumerate(self.config.employees):
            employee_schedule = {
                'name': emp_name,
                'shifts': [],
                'day_count': 0,
                'night_count': 0,
                'offb_count': 0,
                'offr_count': 0
            }

            for d in range(self.config.num_days):
                for s in range(4):
                    if self.solver.Value(self.shifts[(i, d, s)]) == 1:
                        shift_type = s
                        employee_schedule['shifts'].append({
                            'day': d + 1,
                            'type': shift_type,
                            'symbol': ShiftType.get_symbol(shift_type),
                            'name': ShiftType.get_full_name(shift_type)
                        })

                        if shift_type == ShiftType.DAY:
                            employee_schedule['day_count'] += 1
                        elif shift_type == ShiftType.NIGHT:
                            employee_schedule['night_count'] += 1
                        elif shift_type == ShiftType.OFF_B:
                            employee_schedule['offb_count'] += 1
                        elif shift_type == ShiftType.OFF_R:
                            employee_schedule['offr_count'] += 1
                        break

            schedule.append(employee_schedule)
            statistics['employee_stats'].append({
                'name': emp_name,
                'day': employee_schedule['day_count'],
                'night': employee_schedule['night_count'],
                'offb': employee_schedule['offb_count'],
                'offr': employee_schedule['offr_count']
            })

        # 날짜별 인원 수 통계
        for d in range(self.config.num_days):
            day_workers = sum(
                self.solver.Value(self.shifts[(i, d, ShiftType.DAY)])
                for i in range(self.config.num_employees)
            )
            night_workers = sum(
                self.solver.Value(self.shifts[(i, d, ShiftType.NIGHT)])
                for i in range(self.config.num_employees)
            )
            statistics['daily_coverage'].append({
                'day': d + 1,
                'day_workers': day_workers,
                'night_workers': night_workers
            })

        return {
            'schedule': schedule,
            'statistics': statistics,
            'config': self.config.get_info()
        }
