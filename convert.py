import pandas as pd
import json
import os

# 1. CSV 파일들이 들어있는 폴더 이름
DATA_FOLDER = "csv_data"

# 2. 파일 목록 정의
file_map = {
    "AIDA 1": "AIDA 문제 - AIDA 1.csv",
    "AIDA 2": "AIDA 문제 - AIDA 2.csv",
    "AIDA 3": "AIDA 문제 - AIDA 3.csv",
    "AIDA 4": "AIDA 문제 - AIDA 4.csv"
}

all_data = {}

print(f"📂 '{DATA_FOLDER}' 폴더에서 파일을 읽어옵니다...")

for level, filename in file_map.items():
    file_path = os.path.join(DATA_FOLDER, filename)
    
    if not os.path.exists(file_path):
        print(f"⚠️ 파일 없음: {file_path}")
        continue
        
    try:
        # [수정] engine='python'과 on_bad_lines='skip' 추가
        # engine='python': C 엔진보다 느리지만 파싱 오류에 더 유연함
        # on_bad_lines='skip': 형식이 잘못된 행(예: 139번째 줄)은 무시하고 계속 진행
        df = pd.read_csv(file_path, engine='python', on_bad_lines='skip')
        
        questions = []
        
        for _, row in df.iterrows():
            # 1. 행 데이터를 딕셔너리로 변환
            row_dict = row.to_dict()
            
            # 2. 필수 컬럼들을 '꺼내서(pop)' 변수에 저장
            q_id = row_dict.pop('question_id', '')
            q_text = row_dict.pop('question', '')
            
            img_val = row_dict.pop('image', '')
            img = "" if pd.isna(img_val) else str(img_val).strip()
            
            opt1 = row_dict.pop('option_1', '')
            opt2 = row_dict.pop('option_2', '')
            opt3 = row_dict.pop('option_3', '')
            opt4 = row_dict.pop('option_4', '')
            
            ans = row_dict.pop('answer', 1)
            expl = row_dict.pop('explanation', '')
            topic = row_dict.pop('topic', '')

            # 3. 필수 데이터로 기본 구조 생성
            q_data = {
                "id": str(q_id),
                "q": str(q_text),
                "img": img,
                "options": [
                    str(opt1), str(opt2), str(opt3), str(opt4)
                ],
                "a": int(ans) if pd.notna(ans) else 1,
                "expl": str(expl) if pd.notna(expl) else "",
                "topic": str(topic) if pd.notna(topic) else ""
            }
            
            # 4. 남은 컬럼들 자동 추가
            for key, val in row_dict.items():
                if pd.isna(val):
                    val = ""
                q_data[key] = str(val)

            questions.append(q_data)
        
        all_data[level] = questions
        print(f"✅ {level}: {len(questions)}문제 변환 성공")
        
    except Exception as e:
        print(f"❌ {filename} 읽기 실패: {e}")

# 3. JSON 파일 저장
output_file = "quiz_data.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

print(f"\n🎉 변환 완료! '{output_file}' 파일이 생성되었습니다.")