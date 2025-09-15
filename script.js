const board = document.getElementById('game-board');
const keyboardDiv = document.getElementById('keyboard');
const startBtn = document.getElementById('start-btn');
const timeSelector = document.getElementById('time-selector');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const messageDiv = document.getElementById('message');

let VALID_WORDS = [];
let currentWord = '';
let currentRow = 0;
let currentCell = 0;
let score = 0;
let totalTime = 0;
let timerInterval;
let previousGuesses = new Set();
const keyElements = {};

// ----------------- Load all valid words from API -----------------
async function loadValidWords() {
    const res = await fetch('http://127.0.0.1:5000/api/words');
    const data = await res.json();
    VALID_WORDS = data.map(word => word.toUpperCase());
}

// ----------------- Pick a random word -----------------
function pickRandomWord() {
    const randomIndex = Math.floor(Math.random() * VALID_WORDS.length);
    return VALID_WORDS[randomIndex];
}

// ----------------- Timer -----------------
function updateTimerDisplay(secondsLeft) {
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const seconds = String(secondsLeft % 60).padStart(2, '0');
    timerDisplay.textContent = `Time: ${minutes}:${seconds}`;
}

// ----------------- Messages -----------------
function showMessage(text) {
    messageDiv.textContent = text;
    messageDiv.classList.add('show');
    setTimeout(() => {
        messageDiv.classList.remove('show');
        messageDiv.textContent = '';
    }, 2000);
}

// ----------------- Board -----------------
function createBoard() {
    board.innerHTML = '';
    currentRow = 0;
    currentCell = 0;
    previousGuesses.clear();

    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

// ----------------- Keyboard -----------------
function createKeyboard() {
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    keyboardDiv.innerHTML = '';
    keyElements = {};
    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        for (let char of row) {
            const keyBtn = document.createElement('button');
            keyBtn.className = 'key';
            keyBtn.textContent = char;
            keyBtn.disabled = true; // Users don’t click these
            keyElements[char] = keyBtn;
            rowDiv.appendChild(keyBtn);
        }
        keyboardDiv.appendChild(rowDiv);
    });
}

function updateKeyboardColor(letter, color) {
    if (keyElements[letter]) {
        keyElements[letter].style.backgroundColor = color;
        keyElements[letter].style.color = color === '#ccc' ? 'black' : 'white';
    }
}

// ----------------- API Validation -----------------
async function isValidWordAPI(word) {
    const res = await fetch(`http://127.0.0.1:5000/api/validate?word=${word}`);
    const data = await res.json();
    return data.valid;
}

// ----------------- Handle Keypress -----------------
function handleKeyPress(e) {
    const row = board.children[currentRow];
    const cells = row.children;

    const key = e.key.toUpperCase();

    if (e.key === "Backspace") {
        if (currentCell > 0) {
            currentCell--;
            cells[currentCell].textContent = '';
        }
    } else if (e.key === "Enter") {
        submitGuess();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
        if (currentCell < 5) {
            cells[currentCell].textContent = key;
            currentCell++;
        }
    }
}

// ----------------- Submit Guess -----------------
async function submitGuess() {
    const row = board.children[currentRow];
    let guess = '';
    for (let i = 0; i < 5; i++) {
        guess += row.children[i].textContent.toUpperCase();
    }

    if (guess.length !== 5) {
        flashRow(row);
        showMessage('Please fill all 5 letters!');
        return;
    }

    if (previousGuesses.has(guess)) {
        flashRow(row);
        showMessage('You already guessed this word!');
        return;
    }

    previousGuesses.add(guess);

    if (!(await isValidWordAPI(guess))) {
        flashRow(row);
        showMessage('Invalid word! Try again.');
        return;
    }

    let wordLetterCount = {};
    for (let ch of currentWord) wordLetterCount[ch] = (wordLetterCount[ch] || 0) + 1;

    for (let i = 0; i < 5; i++) {
        const cell = row.children[i];
        if (guess[i] === currentWord[i]) {
            cell.style.backgroundColor = 'green';
            cell.style.color = 'white';
            wordLetterCount[guess[i]]--;
            updateKeyboardColor(guess[i], 'green');
        }
    }

    for (let i = 0; i < 5; i++) {
        const cell = row.children[i];
        if (cell.style.backgroundColor) continue;
        if (currentWord.includes(guess[i]) && wordLetterCount[guess[i]] > 0) {
            cell.style.backgroundColor = 'yellow';
            cell.style.color = 'black';
            wordLetterCount[guess[i]]--;
            updateKeyboardColor(guess[i], 'yellow');
        } else {
            cell.style.backgroundColor = '#ccc';
            cell.style.color = 'black';
            updateKeyboardColor(guess[i], '#ccc');
        }
    }

    if (guess === currentWord) {
        score++;
        scoreDisplay.textContent = `Words Solved: ${score}`;
        showMessage('Correct! Next word...');
        await nextWord();
        return;
    }

    if (currentRow === 5) {
        showMessage(`Failed! The correct word was: ${currentWord}`);
        await nextWord();
    } else {
        currentRow++;
        currentCell = 0;
    }
}

// ----------------- Flash Row for Invalid -----------------
function flashRow(row) {
    for (let i = 0; i < 5; i++) {
        const cell = row.children[i];
        cell.classList.add('invalid-flash');
        setTimeout(() => cell.classList.remove('invalid-flash'), 500);
    }
}

// ----------------- Next Word -----------------
async function nextWord() {
    currentRow = 0;
    currentCell = 0;
    previousGuesses.clear();
    createBoard();
    createKeyboard();
    currentWord = pickRandomWord();
}

// ----------------- Start Game -----------------
async function startGame() {
    if (VALID_WORDS.length === 0) await loadValidWords();

    totalTime = parseInt(timeSelector.value);
    score = 0;
    scoreDisplay.textContent = `Words Solved: ${score}`;
    startBtn.disabled = true;
    timeSelector.disabled = true;

    createBoard();
    createKeyboard();
    currentWord = pickRandomWord();
    updateTimerDisplay(totalTime);

    document.addEventListener('keydown', handleKeyPress);

    timerInterval = setInterval(() => {
        totalTime--;
        updateTimerDisplay(totalTime);

        if (totalTime <= 0) {
            clearInterval(timerInterval);
            document.removeEventListener('keydown', handleKeyPress);
            window.location.href = `result.html?score=${score}`;
        }
    }, 1000);
}

startBtn.addEventListener('click', startGame);