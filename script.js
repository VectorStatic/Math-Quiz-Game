class MathQuiz {
    constructor() {
        // State Variables
        this.stats = { total: 0, correct: 0, wrong: 0 };
        this.config = { level: 1, limit: 5, quickMode: false };
        this.gameData = { currentAns: 0, timerID: null, timeLeft: 0, maxTime: 20000 }; // 20 seconds
        
        // Cache DOM Elements
        this.dom = {
            screens: { menu: document.getElementById('menu-screen'), game: document.getElementById('game-screen') },
            score: { total: document.getElementById('score-total'), correct: document.getElementById('score-correct'), wrong: document.getElementById('score-wrong') },
            timer: document.getElementById('timer-bar'),
            question: document.getElementById('question-text'),
            qNum: document.getElementById('q-number'),
            input: document.getElementById('user-input'),
            quickBtn: document.getElementById('btn-quick-mode'),
            submitBtn: document.getElementById('btn-submit')
        };

        this.init();
    }

    init() {
        // Event Listeners for Difficulty Buttons
        document.querySelectorAll('.difficulty-grid button').forEach(btn => {
            btn.addEventListener('click', () => this.startGame(parseInt(btn.dataset.level)));
        });

        // Numpad Listeners
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleInput(btn.dataset.val));
        });

        // Control Buttons
        this.dom.submitBtn.addEventListener('click', () => this.checkAnswer());
        document.getElementById('btn-backspace').addEventListener('click', () => this.deleteInput());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetGame());
        
        // Quick Mode Toggle
        this.dom.quickBtn.addEventListener('click', () => {
            this.config.quickMode = !this.config.quickMode;
            this.dom.quickBtn.classList.toggle('active');
            this.dom.quickBtn.textContent = `Quick Mode: ${this.config.quickMode ? 'ON' : 'OFF'}`;
            // Toggle submit button visibility
            this.dom.submitBtn.style.display = this.config.quickMode ? 'none' : 'block';
        });

        document.getElementById('btn-info').addEventListener('click', () => {
            Swal.fire('Quick Mode', 'System will automatically detect the answer as you type. No need to press Submit.', 'info');
        });

        // Keyboard Support
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // --- Game Logic ---

    startGame(level) {
        this.config.level = level;
        this.setDifficultyParams(level);
        
        // Switch Screens
        this.dom.screens.menu.classList.remove('active');
        this.dom.screens.game.classList.add('active');

        // Reset Stats
        this.stats = { total: 0, correct: 0, wrong: 0 };
        this.updateScoreboard();
        
        this.nextQuestion();
    }

    setDifficultyParams(level) {
        // Define limits based on level
        const levels = {
            1: { limit: 10, ops: ['+', '-'] },
            2: { limit: 20, ops: ['+', '-', '*'] },
            3: { limit: 50, ops: ['+', '-', '*'] },
            4: { limit: 100, ops: ['+', '-', '*', '*'] }, // Higher chance of multiply
            5: { limit: 200, ops: ['+', '-', '*', '*', '+'] } 
        };
        const settings = levels[level] || levels[1];
        this.config.limit = settings.limit;
        this.config.ops = settings.ops;
    }

    nextQuestion() {
        this.stats.total++;
        this.updateScoreboard();
        this.dom.input.value = '';
        this.dom.input.focus();

        // Random Number Generation
        const n1 = Math.floor(Math.random() * this.config.limit);
        const n2 = Math.floor(Math.random() * this.config.limit);
        const n3 = Math.floor(Math.random() * this.config.limit);
        
        const op1 = this.getRandomOp();
        const op2 = this.getRandomOp();

        // Generate Math String
        const mathStr = `${n1} ${op1} ${n2} ${op2} ${n3}`;
        
        // Calculate Answer Safely (No eval)
        // We use Function constructor which is safer than eval for simple math, 
        // but ideally we'd just calculate it manually. For this complexity, new Function is acceptable sandbox.
        this.gameData.currentAns = new Function(`return ${mathStr}`)();
        
        // If answer is float, round it to 2 decimals or regenerate?
        // The original game allowed decimals. Let's fix to max 2 decimals to be playable.
        if (!Number.isInteger(this.gameData.currentAns)) {
            this.gameData.currentAns = parseFloat(this.gameData.currentAns.toFixed(2));
        }

        this.dom.question.innerHTML = `${mathStr} = ?`;
        this.dom.qNum.textContent = this.stats.total;

        this.startTimer();
    }

    getRandomOp() {
        const ops = this.config.ops;
        return ops[Math.floor(Math.random() * ops.length)];
    }

    // --- Input Handling ---

    handleInput(val) {
        const currentVal = this.dom.input.value;
        
        // Validation: Don't allow multiple decimals or double negatives
        if (val === '.' && currentVal.includes('.')) return;
        if (val === '-' && currentVal.length > 0) return; 

        this.dom.input.value += val;

        if (this.config.quickMode) {
            this.checkQuickAnswer();
        }
    }

    handleKeyboard(e) {
        if (!this.dom.screens.game.classList.contains('active')) return;

        const key = e.key;
        // Allow numbers, minus, dot
        if (/^[0-9.\-]$/.test(key)) {
            this.handleInput(key);
        }
        // Backspace
        else if (key === 'Backspace') {
            this.deleteInput();
        }
        // Enter
        else if (key === 'Enter') {
            if (!this.config.quickMode) this.checkAnswer();
        }
    }

    deleteInput() {
        this.dom.input.value = this.dom.input.value.slice(0, -1);
    }

    // --- Answer Checking ---

    checkQuickAnswer() {
        // In quick mode, we check strict equality. 
        // Problem: User wants to type "12", checks "1".
        // Solution: Only check if values match. If it's partial, wait.
        const userVal = parseFloat(this.dom.input.value);
        if (userVal === this.gameData.currentAns) {
            // To prevent accidental trigger on "1" when answer is "12",
            // we check if string lengths match roughly or add a tiny delay?
            // For now, let's keep it immediate as requested.
            this.checkAnswer();
        }
    }

    checkAnswer() {
        clearInterval(this.gameData.timerID);
        const userVal = parseFloat(this.dom.input.value);
        
        if (userVal === this.gameData.currentAns) {
            this.handleResult(true);
        } else {
            this.handleResult(false);
        }
    }

    handleResult(isCorrect) {
        if (isCorrect) {
            this.stats.correct++;
            Swal.fire({
                icon: 'success',
                title: 'Correct!',
                text: `${this.gameData.currentAns} is the answer.`,
                timer: 1000,
                showConfirmButton: false,
                backdrop: `rgba(0,0,0,0.1)` // minimalist backdrop
            });
        } else {
            this.stats.wrong++;
            Swal.fire({
                icon: 'error',
                title: 'Wrong!',
                text: `The correct answer was ${this.gameData.currentAns}`,
                timer: 1500,
                showConfirmButton: false
            });
        }
        
        this.updateScoreboard();
        
        // Wait for popup before next question
        setTimeout(() => {
            this.nextQuestion();
        }, isCorrect ? 1000 : 1500);
    }

    // --- Timer Logic ---

    startTimer() {
        clearInterval(this.gameData.timerID);
        const startTime = Date.now();
        const duration = 20000; // 20 seconds
        
        this.dom.timer.style.width = '100%';
        this.dom.timer.style.backgroundColor = 'var(--primary)';

        this.gameData.timerID = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = duration - elapsed;
            const percentage = (remaining / duration) * 100;

            if (percentage <= 0) {
                clearInterval(this.gameData.timerID);
                this.dom.timer.style.width = '0%';
                this.handleTimeout();
            } else {
                this.dom.timer.style.width = `${percentage}%`;
                // Change color if running low
                if (percentage < 30) {
                    this.dom.timer.style.backgroundColor = 'var(--danger)';
                }
            }
        }, 50); // Update every 50ms is smooth enough
    }

    handleTimeout() {
        this.stats.wrong++;
        Swal.fire({
            icon: 'warning',
            title: 'Time Up!',
            text: `The answer was ${this.gameData.currentAns}`,
            timer: 1500,
            showConfirmButton: false
        });
        this.updateScoreboard();
        setTimeout(() => this.nextQuestion(), 1500);
    }

    // --- Utilities ---

    updateScoreboard() {
        // stats.total includes current question, so for display we might want "Completed" or keep it as is.
        // The original code incremented total AFTER answer.
        this.dom.score.total.textContent = this.stats.total - 1; // Display completed
        this.dom.score.correct.textContent = this.stats.correct;
        this.dom.score.wrong.textContent = this.stats.wrong;
    }

    resetGame() {
        clearInterval(this.gameData.timerID);
        this.dom.screens.game.classList.remove('active');
        this.dom.screens.menu.classList.add('active');
    }
}

// Initialize Game on Load
document.addEventListener('DOMContentLoaded', () => {
    new MathQuiz();
});
