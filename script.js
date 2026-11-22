const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const finalScoreEl = document.getElementById("final-score");
const newRecordMsg = document.getElementById("new-record-msg");

const startScreen = document.getElementById("start-screen");
const pauseScreen = document.getElementById("pause-screen");
const gameOverScreen = document.getElementById("gameover-screen");

const startBtn = document.getElementById("start-btn");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const speedSelect = document.getElementById("speed-select");

// Grid Settings
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game State Variables
let snake = [];
let food = { x: 0, y: 0 };
let bonusFood = null;
let bonusTimer = 0;

let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;

let score = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let gameLoop = null;
let gameSpeed = 100;
let isPaused = false;
let isGameRunning = false;
let foodEatenCount = 0;

// Web Audio API for Retro Sound Effects (No external MP3 needed)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "eat") {
        osc.type = "square";
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === "bonus") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.07);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
    } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

// Initialize High Score Display
highScoreEl.textContent = highScore;

// Start or Restart Game
function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    dx = 1;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    foodEatenCount = 0;
    bonusFood = null;
    isPaused = false;
    isGameRunning = true;
    gameSpeed = parseInt(speedSelect.value);

    scoreEl.textContent = score;
    newRecordMsg.classList.add("hidden");
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");

    spawnFood();

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, gameSpeed);
}

// Spawn Normal Food
function spawnFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    // Ensure food doesn't spawn on snake
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            spawnFood();
            return;
        }
    }
}

// Spawn Big Bonus Food (Appears every 5 apples)
function spawnBonusFood() {
    bonusFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    bonusTimer = 50; // Disappears after 50 frames

    for (let part of snake) {
        if ((part.x === bonusFood.x && part.y === bonusFood.y) || 
            (food.x === bonusFood.x && food.y === bonusFood.y)) {
            spawnBonusFood();
            return;
        }
    }
}

// Main Game Update Loop
function update() {
    if (isPaused || !isGameRunning) return;

    dx = nextDx;
    dy = nextDy;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall Collision Check
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        triggerGameOver();
        return;
    }

    // Self Collision Check
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            triggerGameOver();
            return;
        }
    }

    snake.unshift(head);

    // Check Normal Food Eat
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        foodEatenCount++;
        scoreEl.textContent = score;
        playSound("eat");
        spawnFood();

        // Spawn bonus food every 5th food
        if (foodEatenCount % 5 === 0) {
            spawnBonusFood();
        }
    } else {
        snake.pop(); // Remove tail if no food eaten
    }

    // Check Bonus Food Eat & Timer
    if (bonusFood) {
        bonusTimer--;
        if (head.x === bonusFood.x && head.y === bonusFood.y) {
            score += 50;
            scoreEl.textContent = score;
            playSound("bonus");
            bonusFood = null;
        } else if (bonusTimer <= 0) {
            bonusFood = null;
        }
    }

    draw();
}

// Render Graphics on Canvas
function draw() {
    // Clear Canvas with classic LCD background
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid lines
    ctx.strokeStyle = "rgba(15, 56, 15, 0.08)";
    for (let i = 0; i < tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // Draw Normal Food
    ctx.fillStyle = "#0f380f";
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2.5,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Draw Bonus Food (Larger blinking square/diamond)
    if (bonusFood) {
        ctx.fillStyle = bonusTimer % 4 < 2 ? "#0f380f" : "#306230";
        ctx.fillRect(
            bonusFood.x * gridSize + 2,
            bonusFood.y * gridSize + 2,
            gridSize - 4,
            gridSize - 4
        );
    }

    // Draw Snake
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#0f380f" : "#306230";
        ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);

        // Draw Eyes on Head
        if (index === 0) {
            ctx.fillStyle = "#9bbc0f";
            const eyeSize = 3;
            if (dx === 1) { // Moving Right
                ctx.fillRect(part.x * gridSize + 13, part.y * gridSize + 4, eyeSize, eyeSize);
                ctx.fillRect(part.x * gridSize + 13, part.y * gridSize + 13, eyeSize, eyeSize);
            } else if (dx === -1) { // Moving Left
                ctx.fillRect(part.x * gridSize + 4, part.y * gridSize + 4, eyeSize, eyeSize);
                ctx.fillRect(part.x * gridSize + 4, part.y * gridSize + 13, eyeSize, eyeSize);
            } else if (dy === -1) { // Moving Up
                ctx.fillRect(part.x * gridSize + 4, part.y * gridSize + 4, eyeSize, eyeSize);
                ctx.fillRect(part.x * gridSize + 13, part.y * gridSize + 4, eyeSize, eyeSize);
            } else if (dy === 1) { // Moving Down
                ctx.fillRect(part.x * gridSize + 4, part.y * gridSize + 13, eyeSize, eyeSize);
                ctx.fillRect(part.x * gridSize + 13, part.y * gridSize + 13, eyeSize, eyeSize);
            }
        }
    });
}

// Handle Game Over
function triggerGameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);
    playSound("gameover");

    finalScoreEl.textContent = score;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreEl.textContent = highScore;
        newRecordMsg.classList.remove("hidden");
    }

    gameOverScreen.classList.remove("hidden");
}

// Toggle Pause
function togglePause() {
    if (!isGameRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseScreen.classList.remove("hidden");
    } else {
        pauseScreen.classList.add("hidden");
    }
}

// Direction Change Handler
function changeDirection(newDx, newDy) {
    // Prevent 180-degree reverse turn
    if (newDx === -dx && newDy === -dy) return;
    nextDx = newDx;
    nextDy = newDy;
}

// Keyboard Controls
document.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === "Space") {
        togglePause();
        return;
    }

    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") changeDirection(0, -1);
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") changeDirection(0, 1);
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") changeDirection(-1, 0);
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") changeDirection(1, 0);
});

// Button Listeners
startBtn.addEventListener("click", initGame);
resumeBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", initGame);

// On-screen Button Listeners
document.getElementById("btn-up").addEventListener("click", () => changeDirection(0, -1));
document.getElementById("btn-down").addEventListener("click", () => changeDirection(0, 1));
document.getElementById("btn-left").addEventListener("click", () => changeDirection(-1, 0));
document.getElementById("btn-right").addEventListener("click", () => changeDirection(1, 0));

// Initial Canvas Draw
draw();