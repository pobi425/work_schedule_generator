"""
Flask 웹 애플리케이션 - 사회복무요원 근무표 생성기
"""

from flask import Flask, render_template, request, jsonify
import calendar
from datetime import datetime
from schedule_solver import WorkScheduleConfig, WorkScheduleSolver, ShiftType

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False  # 한글 출력을 위해


@app.route('/')
def index():
    """메인 페이지"""
    # 현재 날짜 기본값
    now = datetime.now()
    return render_template('index_new.html',
                         current_year=now.year,
                         current_month=now.month)


@app.route('/api/calendar_info', methods=['POST'])
def calendar_info():
    """달력 정보 API"""
    try:
        data = request.json
        year = int(data['year'])
        month = int(data['month'])

        # 해당 월의 일수
        num_days = calendar.monthrange(year, month)[1]

        # 1일의 요일
        first_day_weekday = calendar.monthrange(year, month)[0]
        first_day_name = calendar.day_name[first_day_weekday]

        # 말일의 요일
        last_day = datetime(year, month, num_days)
        last_day_weekday = last_day.weekday()
        last_day_name = calendar.day_name[last_day_weekday]

        # 달력 생성 (날짜별 요일)
        days = []
        for day in range(1, num_days + 1):
            date = datetime(year, month, day)
            weekday = date.weekday()
            days.append({
                'day': day,
                'weekday': weekday,
                'weekday_name': calendar.day_abbr[weekday],
                'is_weekend': weekday in [5, 6]  # 토요일, 일요일
            })

        return jsonify({
            'success': True,
            'data': {
                'year': year,
                'month': month,
                'num_days': num_days,
                'first_day_weekday': first_day_weekday,
                'first_day_name': first_day_name,
                'last_day_weekday': last_day_weekday,
                'last_day_name': last_day_name,
                'days': days
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/generate_schedule', methods=['POST'])
def generate_schedule():
    """근무표 생성 API"""
    try:
        data = request.json

        # 입력 데이터 파싱
        year = int(data['year'])
        month = int(data['month'])
        employees = data['employees']  # 리스트
        work_days = int(data.get('work_days', 20))
        fixed_shifts = data.get('fixed_shifts', [])  # {employee_idx, day, shift_type}

        # 입력 검증
        if not employees or len(employees) < 2:
            return jsonify({
                'success': False,
                'error': '최소 2명 이상의 인원이 필요합니다.'
            }), 400

        num_days = calendar.monthrange(year, month)[1]
        if work_days > num_days:
            return jsonify({
                'success': False,
                'error': f'근무일수({work_days}일)가 해당 월의 총 일수({num_days}일)를 초과할 수 없습니다.'
            }), 400

        # 설정 생성
        config = WorkScheduleConfig(
            year=year,
            month=month,
            employees=employees,
            work_days=work_days,
            fixed_shifts=fixed_shifts
        )

        # 솔버 실행
        solver = WorkScheduleSolver(config)
        status_name, result = solver.solve(max_time_seconds=120)

        if result:
            # 해답을 찾은 경우
            return jsonify({
                'success': True,
                'status': status_name,
                'result': result
            })
        else:
            # 해답을 찾지 못한 경우
            error_message = (
                "⚠️ 경고: 설정된 제약 조건이 너무 강력하여 모든 필수 조건을 만족하는 "
                "근무표를 생성할 수 없습니다. 최소한의 필수 조건을 제외한 일부 "
                "제약 조건(예: 4일 초과 근무 피하기, 휴무 균등 분포 등)을 "
                "완화하거나 인원수와 근무-휴일 비율을 조정해야 합니다."
            )

            return jsonify({
                'success': False,
                'status': status_name,
                'error': error_message
            }), 422  # Unprocessable Entity


    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'오류가 발생했습니다: {str(e)}'
        }), 500


@app.route('/result')
def result():
    """결과 페이지 (선택적)"""
    return render_template('result.html')


if __name__ == '__main__':
    import webbrowser
    import threading
    import time

    def open_browser():
        """3초 후 브라우저 자동 실행"""
        time.sleep(3)
        webbrowser.open('http://127.0.0.1:5000')

    # 백그라운드에서 브라우저 열기
    threading.Thread(target=open_browser, daemon=True).start()

    print("\n" + "="*50)
    print("  Work Schedule Generator is running!")
    print("  URL: http://127.0.0.1:5000")
    print("  Browser will open automatically...")
    print("="*50 + "\n")

    app.run(debug=False, host='0.0.0.0', port=5000)
