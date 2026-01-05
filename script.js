// ==================================
// FREEDIVING QUIZ SCRIPT
// ==================================

// --- Quiz Generation Logic ---
const DEFAULT_DIFFICULTY_CONFIG = { Easy: 15, Medium: 30, Hard: 15 };
let DIFFICULTY_CONFIG = { ...DEFAULT_DIFFICULTY_CONFIG };

/**
 * Shuffles array in place.
 * @param {Array} array items An array containing the items.
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a quiz set based on difficulty configuration.
 * @param {Array} allQuestions All questions for a level.
 * @returns {Array} A curated set of questions.
 */
function generateQuizSet(allQuestions) {
  const totalQuestionsInConfig = Object.values(DIFFICULTY_CONFIG).reduce((a, b) => a + b, 0);

  // If total questions are less than or equal to configured total, just shuffle all of them
  if (allQuestions.length <= totalQuestionsInConfig) {
    return shuffleArray(allQuestions);
  }

  const buckets = {
    Easy: [],
    Medium: [],
    Hard: []
  };

  allQuestions.forEach((item) => {
    let rawDiff = item.difficulty ? String(item.difficulty).trim() : 'Medium';
    let normalizedDiff = rawDiff.charAt(0).toUpperCase() + rawDiff.slice(1).toLowerCase();
    if (normalizedDiff === 'Normal') {
      normalizedDiff = 'Medium';
    }
    if (buckets[normalizedDiff]) {
      buckets[normalizedDiff].push(item);
    } else {
      buckets['Medium'].push(item);
    }
  });

  let finalExamPaper = [];
  
  for (const [level, targetCount] of Object.entries(DIFFICULTY_CONFIG)) {
    const questionsInBucket = buckets[level];
    const shuffled = shuffleArray(questionsInBucket);
    const selected = shuffled.slice(0, targetCount);
    finalExamPaper = finalExamPaper.concat(selected);
  }

  return shuffleArray(finalExamPaper);
}


// --- Global State & Config ---
let allData = {};
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let wrongAnswers = [];
let currentLevel = '';
let userProgress = { completedLevels: [] };
let lastUsername = '';

// --- DOM Elements ---
const homeScreen = document.getElementById('home-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const usernameModal = document.getElementById('username-modal');
const settingsModal = document.getElementById('settings-modal');

// For theme toggle repositioning
const themeToggleContainer = document.getElementById('global-theme-toggle-container');
const mainWrapper = document.querySelector('.main-wrapper');
const headerActions = document.querySelector('.header-actions');
const containerCustom = document.querySelector('.container-custom');


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Fetch data first, then initialize the rest
    fetch('quiz_data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            allData = data;
            console.log("Quiz data loaded successfully.");
            // These depend on data, so they go in here
            loadDifficultyConfig();
            populateLevelSelector();
            loadProgress();
            updateUIForProgress();
        })
        .catch(error => {
            console.error("Failed to load quiz_data.json:", error);
            alert("퀴즈 데이터를 불러오는 데 실패했습니다. 파일을 확인해주세요.");
        });
    
    // These can be initialized regardless of data
    initTheme();
    attachEventListeners();
});

function attachEventListeners() {
    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
    
    // --- Navigation ---
    // Home Screen
    document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    // Quiz Screen
    document.getElementById('back-to-home-btn').addEventListener('click', goHome);
    document.getElementById('quit-quiz-btn').addEventListener('click', finishQuiz);
    document.getElementById('next-btn').addEventListener('click', nextQuestion);
    // Result Screen
    document.getElementById('restart-btn').addEventListener('click', restartQuiz);
    document.querySelector('#result-screen .home-btn').addEventListener('click', goHome);
    document.getElementById('share-btn').addEventListener('click', shareScore);
    // Leaderboard Screen
    document.getElementById('leaderboard-level-select').addEventListener('change', (e) => renderLeaderboard(e.target.value));
    document.getElementById('leaderboard-home-btn').addEventListener('click', goHome);
    
    // --- Modals ---
    // Username Modal
    document.getElementById('save-score-btn').addEventListener('click', saveScoreAndCloseModal);
    // Settings Modal
    document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.classList.add('hidden'));
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('reset-settings-btn').addEventListener('click', resetSettings);
    
    // Live update total count in settings
    document.getElementById('easy-count').addEventListener('input', updateTotalQuestionsDisplay);
    document.getElementById('medium-count').addEventListener('input', updateTotalQuestionsDisplay);
    document.getElementById('hard-count').addEventListener('input', updateTotalQuestionsDisplay);
}

// --- Theme Management (Feature 6) ---
function initTheme() {
    // Default to dark, only switch to light if explicitly set
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const iconClass = theme === 'light' ? 'fa-sun' : 'fa-moon';
    document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
        icon.className = `fa-solid ${iconClass}`;
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}


// --- Quiz Logic ---
function startQuiz(level) {
    if (!allData[level] || allData[level].length === 0) {
        alert("선택한 레벨의 문제 데이터가 없습니다.");
        return;
    }
    currentLevel = level;
    currentQuestions = generateQuizSet(allData[level]);
    currentIndex = 0;
    score = 0;
    wrongAnswers = [];
    lastUsername = ''; // Reset username for new quiz
    
    // Subtitle 초기화
    const subtitleEl = document.getElementById('result-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = "당신의 최종 성적입니다";
        subtitleEl.style.color = "var(--text-on-dark-secondary)";
        subtitleEl.style.fontWeight = "normal";
    }
    
    showScreen(quizScreen);
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuestions[currentIndex];
    
    document.getElementById('progress-text').innerText = `${currentIndex + 1} / ${currentQuestions.length}`;
    document.getElementById('q-num').innerText = currentIndex + 1;
    document.getElementById('q-text').innerText = q.q;
    
    const imgWrapper = document.getElementById('img-wrapper');
    if (q.img && q.img.trim() !== "") {
        document.getElementById('q-image').src = q.img;
        imgWrapper.classList.remove('hidden');
    } else {
        imgWrapper.classList.add('hidden');
    }

    const optsContainer = document.getElementById('options-container');
    optsContainer.innerHTML = '';
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('next-btn').classList.remove('hidden');

    q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = optText;
        btn.onclick = () => checkAnswer(btn, idx + 1, q.a, q.expl);
        optsContainer.appendChild(btn);
    });
}

function checkAnswer(clickedBtn, selectedIdx, correctIdx, explanation) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
    document.getElementById('next-btn').classList.remove('hidden');

    const q = currentQuestions[currentIndex];

    if (selectedIdx === correctIdx) {
        clickedBtn.classList.add('correct');
        score++;
    } else {
        clickedBtn.classList.add('wrong');
        buttons[correctIdx - 1].classList.add('correct');
        wrongAnswers.push({
            question: q.q,
            userSelect: clickedBtn.innerText,
            correctSelect: q.options[correctIdx - 1],
            explanation: explanation || "해설 없음"
        });
    }

    if (explanation) {
        document.getElementById('explanation').innerText = explanation;
        document.getElementById('feedback').classList.remove('hidden');
    }
}

function nextQuestion() {
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        showResult();
    }
}

function finishQuiz() {
    if (confirm("문제를 그만 풀고 결과를 확인하시겠습니까?")) {
        showResult();
    }
}

function restartQuiz() {
    startQuiz(currentLevel);
}

function goHome() {
    showScreen(homeScreen);
    updateUIForProgress();
}

// --- Screen Management ---
function showScreen(screenToShow) {
    const mainWrapper = document.querySelector('.main-wrapper');
    
    const screenClasses = {
        'home-screen': 'home-screen-active',
        'quiz-screen': 'quiz-screen-active',
        'result-screen': 'result-screen-active',
        'leaderboard-screen': 'leaderboard-screen-active'
    };

    Object.values(screenClasses).forEach(className => mainWrapper.classList.remove(className));

    [homeScreen, quizScreen, resultScreen, leaderboardScreen, usernameModal, settingsModal].forEach(screen => {
        screen.classList.add('hidden');
    });

    if (screenToShow === quizScreen) {
        headerActions.appendChild(themeToggleContainer);
    } else {
        mainWrapper.insertBefore(themeToggleContainer, containerCustom);
    }

    if (screenToShow) {
        screenToShow.classList.remove('hidden');
        const activeClass = screenClasses[screenToShow.id];
        if (activeClass) {
            mainWrapper.classList.add(activeClass);
        }
    }
}

// --- Result & Progress (Feature 4) ---
function showResult() {
    showScreen(resultScreen);
    
    // [뱃지 업데이트]
    const badgeEl = document.getElementById('result-badge');
    if (badgeEl) {
        badgeEl.innerText = currentLevel || "LEVEL TEST";
        badgeEl.classList.remove('hidden');
    }
    
    const total = currentQuestions.length;
    const percentage = total === 0 ? 0 : Math.round((score / total) * 100);
    
    document.getElementById('final-score').innerText = score;
    document.querySelector('.total-score').innerText = `/ ${total}`;

    const messageEl = document.getElementById('result-message');
    const commentEl = document.getElementById('result-comment');
    const iconEl = document.getElementById('result-icon');
    
    if (percentage === 100) {
        messageEl.innerText = "Perfect Master!";
        commentEl.innerText = "이론을 완벽하게 마스터하셨습니다! 당신은 최고의 프리다이버입니다.";
        iconEl.className = "fa-solid fa-trophy";
        iconEl.style.color = "#2ECC71"; // Emerald Green
    } else if (percentage >= 95) {
        messageEl.innerText = "Perfect!";
        commentEl.innerText = "이론을 거의 완벽하게 마스터하셨습니다!";
        iconEl.className = "fa-solid fa-trophy";
        iconEl.style.color = "#FFD700"; // Gold
    } else if (percentage >= 85) {
        messageEl.innerText = "Excellent!";
        commentEl.innerText = "훌륭합니다! 강사 수준의 지식입니다.";
        iconEl.className = "fa-solid fa-award";
        iconEl.style.color = "#C0C0C0"; // Silver
    } else if (percentage >= 75) {
        messageEl.innerText = "Passed";
        commentEl.innerText = "합격입니다! 안전하게 다이빙을 즐기세요.";
        iconEl.className = "fa-solid fa-medal";
        iconEl.style.color = "#CD7F32"; // Bronze
    } else if (percentage >= 60) {
        messageEl.innerText = "Almost there!";
        commentEl.innerText = "조금만 더! 핵심 개념들을 다시 복습해보세요.";
        iconEl.className = "fa-solid fa-book-open";
        iconEl.style.color = "#0ea5e9"; // Primary Blue
    } else {
        messageEl.innerText = "Try Again";
        commentEl.innerText = "기초부터 다시 한번! 포기하지 마세요.";
        iconEl.className = "fa-solid fa-person-drowning";
        iconEl.style.color = "#ef4444"; // Red
    }

    if (percentage >= 75) {
        updateProgress(currentLevel);
    }

    renderReview();

    const topScores = getScores(currentLevel);
    if (score > 0 && (topScores.length < 10 || score > topScores[topScores.length - 1].score)) {
        setTimeout(() => usernameModal.classList.remove('hidden'), 500);
    }
}

function loadProgress() {
    const savedProgress = localStorage.getItem('freedivingQuizProgress');
    if (savedProgress) {
        userProgress = JSON.parse(savedProgress);
    }
}

function saveProgress() {
    localStorage.setItem('freedivingQuizProgress', JSON.stringify(userProgress));
}

function updateProgress(level) {
    if (!userProgress.completedLevels.includes(level)) {
        userProgress.completedLevels.push(level);
        saveProgress();
    }
}

function updateUIForProgress() {
    document.querySelectorAll('.level-card').forEach(card => {
        if (userProgress.completedLevels.includes(card.dataset.level)) {
            card.classList.add('completed');
        } else {
            card.classList.remove('completed');
        }
    });
}

function renderReview() {
    const reviewContainer = document.getElementById('review-container');
    const listContainer = document.getElementById('wrong-answers-list');
    listContainer.innerHTML = "";

    if (wrongAnswers.length === 0) {
        reviewContainer.classList.add('hidden');
        return;
    }
    reviewContainer.classList.remove('hidden');
    wrongAnswers.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `<div class="review-q"><span class="badge bg-danger mb-2">오답 ${idx + 1}</span><p>${item.question}</p></div><div class="review-details"><div class="my-answer"><i class="fa-solid fa-xmark text-danger"></i> <span class="label">내가 고른 답:</span> ${item.userSelect}</div><div class="correct-answer"><i class="fa-solid fa-check text-success"></i> <span class="label">정답:</span> ${item.correctSelect}</div><div class="review-expl"><i class="fa-solid fa-comment-dots"></i> ${item.explanation}</div></div>`;
        listContainer.appendChild(card);
    });
}

// --- Leaderboard (Feature 3) ---
function getScores(level) {
    const scores = localStorage.getItem(`leaderboard_${level}`);
    return scores ? JSON.parse(scores) : [];
}

function saveScore(level, name, score, total) {
    const scores = getScores(level);
    scores.push({ name, score, total, date: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score || new Date(a.date) - new Date(b.date));
    const newScores = scores.slice(0, 10);
    localStorage.setItem(`leaderboard_${level}`, JSON.stringify(newScores));
}

function saveScoreAndCloseModal() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();

    if (username) {
        // [이스터에그] 이름이 'jjuuuunn'이면 만점으로 조작
        if (username === 'jjuuuunn') {
            // 1. 점수를 전체 문제 수(만점)로 변경
            score = currentQuestions.length;

            // 2. 결과 화면 UI를 'Perfect Master' 상태로 즉시 업데이트
            document.getElementById('final-score').innerText = score;
            
            const messageEl = document.getElementById('result-message');
            const commentEl = document.getElementById('result-comment');
            const iconEl = document.getElementById('result-icon');

            messageEl.innerText = "Developer God!";
            commentEl.innerText = "이스터에그 발동! 개발자의 권한으로 만점 처리되었습니다.";
            
            // 아이콘과 색상도 최고 등급(Emerald)으로 변경
            iconEl.className = "fa-solid fa-trophy";
            iconEl.style.color = "#2ECC71"; 

            // 알림 효과
            alert("⚡ 치트키 발동! 점수가 만점으로 수정되었습니다. ⚡");
        }

        lastUsername = username; 
        
        // 조작된(혹은 원래) 점수로 저장
        saveScore(currentLevel, username, score, currentQuestions.length);
        
        // 화면의 서브타이틀 업데이트
        const subtitleEl = document.getElementById('result-subtitle');
        if (subtitleEl) {
            subtitleEl.innerText = `${username}님의 최종 성적입니다`;
            subtitleEl.style.color = "var(--primary-accent)"; 
            subtitleEl.style.fontWeight = "bold"; 
        }

        usernameModal.classList.add('hidden');
        usernameInput.value = '';
        showNotification("🏆 점수가 리더보드에 저장되었습니다!");
    } else {
        alert("이름을 입력해주세요.");
    }
}

function showLeaderboard() {
    showScreen(leaderboardScreen);
    const levelToShow = currentLevel || Object.keys(allData)[0] || 'AIDA 2';
    document.getElementById('leaderboard-level-select').value = levelToShow;
    renderLeaderboard(levelToShow);
}

function renderLeaderboard(level) {
    const scores = getScores(level);
    const listEl = document.getElementById('leaderboard-list');
    listEl.innerHTML = '';
    if (scores.length === 0) {
        listEl.innerHTML = '<p class="text-center p-3">아직 등록된 점수가 없습니다.</p>';
        return;
    }
    scores.forEach((item, idx) => {
        const scoreEl = document.createElement('div');
        scoreEl.className = 'leaderboard-item';
        scoreEl.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="rank me-3">#${idx + 1}</span>
                <span class="name">${item.name}</span>
            </div>
            <span class="score">${item.score} / ${item.total}</span>
        `;
        listEl.appendChild(scoreEl);
    });
}

function populateLevelSelector() {
    const selectEl = document.getElementById('leaderboard-level-select');
    if (Object.keys(allData).length > 0) {
        selectEl.innerHTML = Object.keys(allData).map(level => `<option value="${level}">${level}</option>`).join('');
    }
}

// --- Share Score (Feature 5) ---
async function shareScore() {
    const captureTarget = document.getElementById('capture-target');
    const originalScreen = document.getElementById('result-screen');
    
    // 1. Clone result screen
    const clone = originalScreen.cloneNode(true);
    
    // 2. Remove unnecessary elements
    const elementsToRemove = [
        clone.querySelector('#share-btn'),      
        clone.querySelector('.result-actions'), 
        clone.querySelector('#review-container'),
        clone.querySelector('.btn-back')        
    ];
    elementsToRemove.forEach(el => { if (el) el.remove(); });

    // 3. Create Capture Wrapper
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const bodyStyle = window.getComputedStyle(document.body);
    
    const wrapper = document.createElement('div');
    wrapper.style.backgroundImage = bodyStyle.backgroundImage; 
    wrapper.style.backgroundColor = bodyStyle.backgroundColor;
    wrapper.style.padding = '60px 40px 40px 40px'; 
    wrapper.style.width = '550px';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center'; 
    wrapper.style.justifyContent = 'center';
    wrapper.style.fontFamily = "'Noto Sans KR', sans-serif";
    
    const isLight = currentTheme === 'light';
    wrapper.style.color = isLight ? '#1e293b' : '#f8fafc';

    // 4. Style adjustments for clone
    clone.classList.remove('hidden', 'fade-in');
    clone.style.display = 'flex';           
    clone.style.flexDirection = 'column';   
    clone.style.alignItems = 'center';      
    clone.style.width = '100%';
    clone.style.margin = '0 auto';          
    clone.style.animation = 'none';

    // Title style fix for html2canvas
    const originalTitle = document.querySelector('.result-title');
    const clonedTitle = clone.querySelector('.result-title');
    if (originalTitle && clonedTitle) {
        clonedTitle.innerText = originalTitle.innerText;
        clonedTitle.style.background = 'none';
        clonedTitle.style.webkitTextFillColor = 'initial';
        clonedTitle.style.color = isLight ? '#1e293b' : '#f8fafc';
        clonedTitle.style.marginBottom = '5px';
    }

    // Fix Score Circle alignment
    const scoreContainer = clone.querySelector('.score-container');
    if (scoreContainer) {
        scoreContainer.style.margin = '20px auto 30px auto'; 
    }

    // 5. Create Footer
    const footer = document.createElement('div');
    footer.className = 'capture-footer';
    footer.innerHTML = `
        <span><i class="fa-brands fa-instagram"></i> jjuuuunn.hob</span>
        <span style="opacity: 0.3;">|</span>
        <span>jjuuuunn.github.io/freediving_quiz</span>
    `;

    // 6. Assemble
    wrapper.appendChild(clone);
    wrapper.appendChild(footer);
    
    captureTarget.innerHTML = '';
    captureTarget.appendChild(wrapper);

    await document.fonts.ready;

    // 7. Prepare share text
    const total = currentQuestions.length;
    const resultMessage = document.getElementById('result-message').innerText;
    let finalNameStr = '';
    const subtitleEl = document.getElementById('result-subtitle');
    if (subtitleEl) {
        const displayedName = subtitleEl.innerText
            .replace('님의 최종 성적입니다', '')
            .replace('당신의 최종 성적입니다', '').trim();
        finalNameStr = displayedName || lastUsername || '';
    }

    const textToShare = `🌊 AIDA 프리다이빙 퀴즈 결과 🌊\n\n레벨: ${currentLevel}\n점수: ${score} / ${total}\n${finalNameStr ? `이름: ${finalNameStr}\n` : ''}\n${resultMessage}\n\n당신도 도전해보세요!`;

    try {
        const canvas = await html2canvas(wrapper, {
            useCORS: true,
            scale: 2,
            backgroundColor: null,
            logging: false,
        });

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], "freediving_result.png", { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Freediving Evaluation Result',
                        text: textToShare
                    });
                } catch (shareError) {
                    if (shareError.name !== 'AbortError') console.error(shareError);
                }
            } else {
                const link = document.createElement('a');
                link.download = 'freediving_result.png';
                link.href = canvas.toDataURL();
                link.click();
                alert("결과 이미지가 다운로드 되었습니다.");
            }
            captureTarget.innerHTML = '';
        }, 'image/png');

    } catch (err) {
        console.error('Capture failed:', err);
        alert('이미지 생성에 실패했습니다.');
        captureTarget.innerHTML = '';
    }
}

// --- UI Helpers ---
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// --- Settings Modal Logic ---
function loadDifficultyConfig() {
    const savedConfig = localStorage.getItem('freedivingQuizDifficultyConfig');
    if (savedConfig) {
        DIFFICULTY_CONFIG = JSON.parse(savedConfig);
    } else {
        DIFFICULTY_CONFIG = { ...DEFAULT_DIFFICULTY_CONFIG };
    }
}

function saveDifficultyConfig(config) {
    localStorage.setItem('freedivingQuizDifficultyConfig', JSON.stringify(config));
    DIFFICULTY_CONFIG = config;
}

function openSettingsModal() {
    document.getElementById('easy-count').value = DIFFICULTY_CONFIG.Easy;
    document.getElementById('medium-count').value = DIFFICULTY_CONFIG.Medium;
    document.getElementById('hard-count').value = DIFFICULTY_CONFIG.Hard;
    updateTotalQuestionsDisplay();
    settingsModal.classList.remove('hidden');
}

function saveSettings() {
    const easy = parseInt(document.getElementById('easy-count').value, 10);
    const medium = parseInt(document.getElementById('medium-count').value, 10);
    const hard = parseInt(document.getElementById('hard-count').value, 10);

    if (isNaN(easy) || isNaN(medium) || isNaN(hard) || easy < 0 || medium < 0 || hard < 0) {
        alert("유효한 숫자를 입력해주세요 (0 이상).");
        return;
    }

    const newConfig = { Easy: easy, Medium: medium, Hard: hard };
    saveDifficultyConfig(newConfig);
    settingsModal.classList.add('hidden');
    showNotification("⚙️ 설정이 저장되었습니다.");
}

function resetSettings() {
    if (confirm("설정을 기본값으로 초기화하시겠습니까?")) {
        saveDifficultyConfig({ ...DEFAULT_DIFFICULTY_CONFIG });
        openSettingsModal(); // Refresh modal values
        showNotification("⚙️ 설정이 초기화되었습니다.");
    }
}

function updateTotalQuestionsDisplay() {
    const easy = parseInt(document.getElementById('easy-count').value, 10) || 0;
    const medium = parseInt(document.getElementById('medium-count').value, 10) || 0;
    const hard = parseInt(document.getElementById('hard-count').value, 10) || 0;
    const total = easy + medium + hard;
    document.getElementById('total-questions-display').innerText = `총 ${total} 문제`;
}