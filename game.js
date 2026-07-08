// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');

// Responsive canvas sizing
function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Maintain 2:1 aspect ratio
    canvas.width = rect.width;
    canvas.height = rect.width / 2;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game objects
const paddleWidth = canvas.width * 0.02;
const paddleHeight = canvas.height * 0.25;
const ballSize = canvas.width * 0.015;
const ballSpeed = canvas.width * 0.004;
const paddleSpeed = canvas.height * 0.01;

const player = {
    x: paddleWidth * 2,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    score: 0
};

const computer = {
    x: canvas.width - paddleWidth * 3,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    score: 0
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    dx: ballSpeed,
    dy: ballSpeed,
    radius: ballSize
};

// Game state
let gameRunning = false;
let gameStarted = false;
let keys = {
    ArrowUp: false,
    ArrowDown: false
};

let mouseY = canvas.height / 2;
let touchActive = false;

// AI Configuration - Predictive AI
const aiConfig = {
    reactionDelay: 0,      // Frames to delay AI reaction (0 = instant)
    predictionAccuracy: 1, // 0.5 = 50% accurate, 1 = perfect prediction
    decisionBuffer: 15,    // Pixels of buffer when positioning
    maxSpeed: paddleSpeed * 0.9
};

// AI tracking
let aiReactionCounter = 0;
let predictedBallY = canvas.height / 2;

// Input handling - Keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        e.preventDefault();
        toggleGame();
    }
    if (e.key === 'ArrowUp') {
        keys.ArrowUp = true;
    }
    if (e.key === 'ArrowDown') {
        keys.ArrowDown = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') {
        keys.ArrowUp = false;
    }
    if (e.key === 'ArrowDown') {
        keys.ArrowDown = false;
    }
});

// Input handling - Mouse
document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = e.clientY - rect.top;
    // Clamp to canvas
    mouseY = Math.max(0, Math.min(mouseY, canvas.height));
});

// Input handling - Touch
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchActive = true;
    updateTouchPosition(e);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (touchActive) {
        updateTouchPosition(e);
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchActive = false;
});

function updateTouchPosition(e) {
    if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;
        // Clamp to canvas
        mouseY = Math.max(0, Math.min(touchY, canvas.height));
    }
}

// Toggle game state
function toggleGame() {
    if (!gameStarted) {
        gameStarted = true;
        gameRunning = true;
        statusText.textContent = 'Game Running - Press SPACE to pause';
    } else {
        gameRunning = !gameRunning;
        if (gameRunning) {
            statusText.textContent = 'Game Running - Press SPACE to pause';
        } else {
            statusText.textContent = 'Game Paused - Press SPACE to resume';
        }
    }
}

// Reset ball
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    
    // Random direction
    const angle = (Math.random() - 0.5) * 0.6; // -0.3 to 0.3 radians
    const speed = ballSpeed;
    
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * speed * Math.cos(angle);
    ball.dy = speed * Math.sin(angle);
    
    aiReactionCounter = 0;
    predictedBallY = canvas.height / 2;
}

// Predictive AI - Calculate where ball will be when it reaches computer paddle
function predictBallTrajectory() {
    // Only predict if ball is moving toward computer
    if (ball.dx <= 0) {
        return canvas.height / 2; // Default to center if ball moving away
    }

    // Calculate time for ball to reach computer paddle
    const distanceToComputer = computer.x - ball.x;
    const timeToReach = Math.abs(distanceToComputer / ball.dx);

    // Simulate ball trajectory
    let simulatedY = ball.y;
    let simulatedDy = ball.dy;

    for (let i = 0; i < timeToReach; i++) {
        simulatedY += simulatedDy;

        // Account for wall bounces
        if (simulatedY - ball.radius <= 0 || simulatedY + ball.radius >= canvas.height) {
            simulatedDy *= -1;
            simulatedY = Math.max(ball.radius, Math.min(canvas.height - ball.radius, simulatedY));
        }
    }

    // Add imperfection to prediction (simulates "difficulty")
    const predictionError = (Math.random() - 0.5) * canvas.height * (1 - aiConfig.predictionAccuracy);
    return simulatedY + predictionError;
}

// AI Decision Making
function updateComputerAI() {
    // Reaction delay - accumulates frames before AI reacts
    if (aiReactionCounter > 0) {
        aiReactionCounter--;
        return; // Don't move while in reaction delay
    }

    // Calculate predicted ball position
    predictedBallY = predictBallTrajectory();

    // AI targets the predicted position with a buffer zone
    const computerCenter = computer.y + computer.height / 2;
    const targetY = predictedBallY;
    const errorMargin = aiConfig.decisionBuffer;

    // Intelligent movement decision
    if (computerCenter < targetY - errorMargin) {
        // Move down
        computer.y = Math.min(canvas.height - computer.height, computer.y + aiConfig.maxSpeed);
    } else if (computerCenter > targetY + errorMargin) {
        // Move up
        computer.y = Math.max(0, computer.y - aiConfig.maxSpeed);
    }
    // If within error margin, stay still (less twitchy)
}

// Update game logic
function update() {
    if (!gameRunning) return;

    // Player paddle control
    if (keys.ArrowUp) {
        player.y = Math.max(0, player.y - paddleSpeed);
    }
    if (keys.ArrowDown) {
        player.y = Math.min(canvas.height - player.height, player.y + paddleSpeed);
    }

    // Mouse/Touch control
    const targetY = mouseY - player.height / 2;
    player.y = Math.max(0, Math.min(canvas.height - player.height, targetY));

    // Update AI using predictive algorithm
    updateComputerAI();

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom walls
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
        ball.dy *= -1;
        ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
    }

    // Ball collision with paddles
    if (
        ball.x - ball.radius <= player.x + player.width &&
        ball.y >= player.y &&
        ball.y <= player.y + player.height
    ) {
        ball.dx = Math.abs(ball.dx);
        ball.x = player.x + player.width + ball.radius;

        // Add spin based on where ball hits paddle
        const hitPos = (ball.y - player.y) / player.height - 0.5;
        ball.dy += hitPos * ballSpeed * 0.5;
    }

    if (
        ball.x + ball.radius >= computer.x &&
        ball.y >= computer.y &&
        ball.y <= computer.y + computer.height
    ) {
        ball.dx = -Math.abs(ball.dx);
        ball.x = computer.x - ball.radius;

        // Add spin based on where ball hits paddle
        const hitPos = (ball.y - computer.y) / computer.height - 0.5;
        ball.dy += hitPos * ballSpeed * 0.5;
    }

    // Ball out of bounds - score
    if (ball.x - ball.radius < 0) {
        computer.score++;
        document.getElementById('computerScore').textContent = computer.score;
        resetBall();
    }

    if (ball.x + ball.radius > canvas.width) {
        player.score++;
        document.getElementById('playerScore').textContent = player.score;
        resetBall();
    }

    // Limit ball speed
    const maxSpeed = ballSpeed * 2;
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (speed > maxSpeed) {
        ball.dx = (ball.dx / speed) * maxSpeed;
        ball.dy = (ball.dy / speed) * maxSpeed;
    }
}

// Draw functions
function draw() {
    // Clear canvas with dark background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
    ctx.shadowBlur = 10;
    
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillRect(computer.x, computer.y, computer.width, computer.height);

    // Draw ball
    ctx.fillStyle = '#ffff00';
    ctx.shadowColor = 'rgba(255, 255, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // DEBUG: Draw predicted ball position (optional - uncomment to see AI prediction)
    // ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
    // ctx.fillRect(computer.x - 50, predictedBallY - 5, 40, 10);

    ctx.shadowBlur = 0;
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

// Handle window resize to reset ball if canvas resizes significantly
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (gameRunning) {
            resetBall();
        }
    }, 500);
});
