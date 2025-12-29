let allData = {};
let currentQuestions = [];
let currentIndex = 0;
let score = 0;

// 데이터 로드
fetch('quiz_data.json')
    .then(response => response.json())
    .then(data => {
        allData = data;
        console.log("Data Loaded");
    })
    .catch(error => alert("quiz_data.json 파일을 찾을 수 없습니다."));

function startQuiz(level) {
    if (!allData[level]) {
        alert("데이터 로딩 중입니다. 잠시만 기다려주세요.");
        return;
    }
    
    // 문제 랜덤 섞기
    currentQuestions = [...allData[level]].sort(() => Math.random() - 0.5);
    currentIndex = 0;
    score = 0;
    
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuestions[currentIndex];
    
    // 상단 진행바 및 문제 번호
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('q-num').innerText = currentIndex + 1;
    
    // 질문 텍스트 및 태그
    document.getElementById('q-text').innerText = q.q;
    document.getElementById('q-tags').innerText = q.topic ? q.topic : '일반';
    
    // 이미지 처리
    const imgWrapper = document.getElementById('img-wrapper');
    const imgEl = document.getElementById('q-image');
    if (q.img && q.img.trim() !== "") {
        imgEl.src = q.img;
        imgWrapper.classList.remove('hidden');
    } else {
        imgWrapper.classList.add('hidden');
    }

    // 보기 초기화
    const optsContainer = document.getElementById('options-container');
    optsContainer.innerHTML = '';
    
    // 이전 결과/버튼 숨기기
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');

    // 보기 버튼 생성
    q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        // 새로 정의한 CSS 클래스 적용
        btn.className = 'option-btn';
        btn.innerText = optText;
        
        // 클릭 이벤트 연결
        btn.onclick = () => checkAnswer(btn, idx + 1, q.a, q.expl);
        optsContainer.appendChild(btn);
    });
}

function checkAnswer(clickedBtn, selectedIdx, correctIdx, explanation) {
    const buttons = document.querySelectorAll('.option-btn');
    
    // 모든 버튼 비활성화 (중복 클릭 방지)
    buttons.forEach(btn => btn.disabled = true);

    // 정답/오답 표시 CSS 클래스 추가
    if (selectedIdx === correctIdx) {
        clickedBtn.classList.add('correct'); // 초록색
        score++;
    } else {
        clickedBtn.classList.add('wrong'); // 빨간색
        // 정답인 버튼도 찾아서 초록색으로 표시해줌
        buttons[correctIdx - 1].classList.add('correct');
    }

    // 해설 표시
    const explEl = document.getElementById('explanation');
    explEl.innerText = explanation ? explanation : "별도의 해설이 없습니다.";
    document.getElementById('feedback').classList.remove('hidden');
    
    // 다음 버튼 표시
    document.getElementById('next-btn').classList.remove('hidden');
}

// ... (위쪽 코드는 동일) ...

// [수정] 다음 문제 함수 (alert 제거)
function nextQuestion() {
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        // 퀴즈 종료 -> 결과 화면 표시
        showResult();
    }
}

// [신규] 결과 화면 표시 함수
function showResult() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    const total = currentQuestions.length;
    const percentage = (score / total) * 100;
    
    // 점수 표시
    document.getElementById('final-score').innerText = score;
    document.querySelector('.total-score').innerText = `/ ${total}`;

    // 점수에 따른 메시지와 스타일 설정
    const messageEl = document.getElementById('result-message');
    const commentEl = document.getElementById('result-comment');
    const iconEl = document.getElementById('result-icon');
    const circle = document.querySelector('.score-circle');

    // AIDA 기준 (75% 이상 합격으로 가정)
    if (percentage >= 90) {
        messageEl.innerText = "Master Diver!";
        commentEl.innerText = "완벽합니다! 이론은 마스터하셨네요.";
        iconEl.className = "fa-solid fa-trophy";
        iconEl.style.color = "#ffd700"; // Gold
        circle.style.borderColor = "#ffd700"; 
    } else if (percentage >= 75) {
        messageEl.innerText = "Passed (합격)";
        commentEl.innerText = "축하합니다! 기준 점수를 통과했습니다.";
        iconEl.className = "fa-solid fa-medal";
        iconEl.style.color = "#00e676"; // Green
        circle.style.borderColor = "#00e676";
    } else {
        messageEl.innerText = "Try Again";
        commentEl.innerText = "조금 더 공부가 필요합니다. 다시 도전해보세요!";
        iconEl.className = "fa-solid fa-person-drowning"; // 물에 빠진 아이콘..ㅎㅎ
        iconEl.style.color = "#ff5252"; // Red
        circle.style.borderColor = "#ff5252";
    }
}

// [신규] 다시 풀기
function restartQuiz() {
    // 현재 레벨 그대로 다시 시작
    score = 0;
    currentIndex = 0;
    // 문제 다시 섞기
    currentQuestions.sort(() => Math.random() - 0.5);
    
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    renderQuestion();
}

// [수정] 홈으로 가기 (모든 화면 초기화)
function goHome() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
}