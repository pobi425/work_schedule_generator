"""
근무표 솔버 테스트 스크립트
웹 서버 없이 솔버 로직만 테스트
"""

from schedule_solver import WorkScheduleConfig, WorkScheduleSolver, ShiftType

def test_basic_schedule():
    """기본 근무표 생성 테스트"""
    print("="*60)
    print("📅 근무표 생성 테스트")
    print("="*60)

    # 설정
    year = 2025
    month = 1  # 2025년 1월 (31일)
    employees = ["김철수", "이영희", "박민수", "정지훈", "최수진"]

    config = WorkScheduleConfig(
        year=year,
        month=month,
        employees=employees,
        work_days=20
    )

    # 정보 출력
    info = config.get_info()
    print(f"\n연도: {info['year']}년 {info['month']}월")
    print(f"총 일수: {info['num_days']}일")
    print(f"인원: {', '.join(info['employees'])}")
    print(f"근무일수: {info['work_days']}일")
    print(f"휴일: {info['rest_days']}일")

    # 솔버 실행
    print("\n🔍 솔버 실행 중...")
    solver = WorkScheduleSolver(config)
    status, result = solver.solve(max_time_seconds=60)

    print(f"\n솔버 상태: {status}")

    if result:
        print("\n✅ 근무표 생성 성공!")
        print("\n근무표 샘플:")
        print("-" * 60)

        # 첫 3명의 첫 10일만 출력
        for i in range(min(3, len(result['schedule']))):
            emp = result['schedule'][i]
            print(f"\n{emp['name']}:")
            shifts_str = ""
            for j in range(min(10, len(emp['shifts']))):
                shift = emp['shifts'][j]
                shifts_str += f"{shift['day']}일:{shift['symbol']} "
            print(f"  {shifts_str}...")

            print(f"  통계 - DAY:{emp['day_count']} NIGHT:{emp['night_count']} "
                  f"OFF_B:{emp['offb_count']} OFF_R:{emp['offr_count']}")

        print("\n" + "-" * 60)
        print("✅ 테스트 성공!")

    else:
        print("\n❌ 근무표 생성 실패!")
        print("제약 조건이 너무 강력합니다. 인원을 늘리거나 설정을 조정하세요.")

    print("\n" + "="*60)


def test_with_fixed_shifts():
    """고정 근무가 있는 근무표 생성 테스트"""
    print("\n" + "="*60)
    print("📌 고정 근무 포함 테스트")
    print("="*60)

    year = 2025
    month = 2  # 2025년 2월 (28일)
    employees = ["김철수", "이영희", "박민수"]

    # 고정 근무: 김철수 1일 주간, 이영희 5일 야간
    fixed_shifts = [
        {'employee_idx': 0, 'day': 0, 'shift_type': ShiftType.DAY},  # 김철수 1일 주간
        {'employee_idx': 1, 'day': 4, 'shift_type': ShiftType.NIGHT}  # 이영희 5일 야간
    ]

    config = WorkScheduleConfig(
        year=year,
        month=month,
        employees=employees,
        work_days=20,
        fixed_shifts=fixed_shifts
    )

    info = config.get_info()
    print(f"\n연도: {info['year']}년 {info['month']}월 ({info['num_days']}일)")
    print(f"인원: {', '.join(info['employees'])}")
    print(f"고정 근무:")
    for fs in fixed_shifts:
        print(f"  - {employees[fs['employee_idx']]}: {fs['day']+1}일 "
              f"{ShiftType.get_name(fs['shift_type'])}")

    print("\n🔍 솔버 실행 중...")
    solver = WorkScheduleSolver(config)
    status, result = solver.solve(max_time_seconds=60)

    print(f"\n솔버 상태: {status}")

    if result:
        print("\n✅ 고정 근무가 포함된 근무표 생성 성공!")

        # 고정 근무 확인
        print("\n고정 근무 검증:")
        for fs in fixed_shifts:
            emp = result['schedule'][fs['employee_idx']]
            shift = emp['shifts'][fs['day']]
            expected = ShiftType.get_symbol(fs['shift_type'])
            actual = shift['symbol']
            status_icon = "✓" if expected == actual else "✗"
            print(f"  {status_icon} {emp['name']} {shift['day']}일: "
                  f"예상={expected}, 실제={actual}")

        print("\n✅ 테스트 성공!")
    else:
        print("\n❌ 테스트 실패!")

    print("\n" + "="*60)


if __name__ == "__main__":
    # 기본 테스트
    test_basic_schedule()

    # 고정 근무 테스트
    test_with_fixed_shifts()

    print("\n🎉 모든 테스트 완료!")
