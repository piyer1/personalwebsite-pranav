const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const scaleX = 50;
const scaleY = 50;
const originX = width / 2;
const originY = height / 2;

let points = [];
let isDrawing = false;
let currentFunction = null;
let currentCoefficients = null;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// New function to get non-zero random integer
function getNonZeroRandomInt(min, max) {
    let num;
    do {
        num = getRandomInt(min, max);
    } while (num === 0);
    return num;
}

// Rest of the helper functions remain the same
function drawGrid() {
    // ... (previous drawGrid implementation)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += scaleX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += scaleY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height/2);
    ctx.lineTo(width, height/2);
    ctx.moveTo(width/2, 0);
    ctx.lineTo(width/2, height);
    ctx.stroke();
}

function toMathCoords(x, y) {
    return {
        x: (x - originX) / scaleX,
        y: -(y - originY) / scaleY
    };
}

function toCanvasCoords(x, y) {
    return {
        x: x * scaleX + originX,
        y: -y * scaleY + originY
    };
}

function generateFunction() {
    const functionType = document.querySelector('input[name="functionType"]:checked').value;
    
    switch(functionType) {
        case 'linear':
            const a = getNonZeroRandomInt(-3, 3);  // Non-zero coefficient for x
            const b = getRandomInt(-3, 3);
            currentFunction = x => a * x + b;
            displayEquation(`f(x) = ${a}x + ${b}`);
            break;
        case 'quadratic':
            const qa = getNonZeroRandomInt(-2, 2);  // Non-zero coefficient for x²
            const qb = getRandomInt(-3, 3);
            const qc = getRandomInt(-3, 3);
            currentFunction = x => qa * x * x + qb * x + qc;
            displayEquation(`f(x) = ${qa}x² + ${qb}x + ${qc}`);
            break;
        case 'cubic':
            const ca = getNonZeroRandomInt(-1, 1);  // Non-zero coefficient for x³
            const cb = getRandomInt(-2, 2);
            const cc = getRandomInt(-2, 2);
            const cd = getRandomInt(-3, 3);
            currentFunction = x => ca * x * x * x + cb * x * x + cc * x + cd;
            displayEquation(`f(x) = ${ca}x³ + ${cb}x² + ${cc}x + ${cd}`);
            break;
        case 'reciprocal':
            const ra = getNonZeroRandomInt(-3, 3);  // Non-zero coefficient for 1/x
            const rb = getRandomInt(-3, 3);
            currentFunction = x => (x !== 0 ? ra/x + rb : undefined);
            displayEquation(`f(x) = ${ra}/x + ${rb}`);
            break;
        case 'trig':
            const ta = getNonZeroRandomInt(-2, 2);  // Non-zero coefficient for trig function
            const tb = getRandomInt(-3, 3);
            const trigType = ['sin', 'cos', 'tan'][Math.floor(Math.random() * 3)];
            switch(trigType) {
                case 'sin':
                    currentFunction = x => ta * Math.sin(x) + tb;
                    displayEquation(`f(x) = ${ta}·sin(x) + ${tb}`);
                    break;
                case 'cos':
                    currentFunction = x => ta * Math.cos(x) + tb;
                    displayEquation(`f(x) = ${ta}·cos(x) + ${tb}`);
                    break;
                case 'tan':
                    currentFunction = x => ta * Math.tan(x) + tb;
                    displayEquation(`f(x) = ${ta}·tan(x) + ${tb}`);
                    break;
            }
            break;
        case 'exponential':
            const ea = getNonZeroRandomInt(-2, 2);  // Non-zero coefficient for e^x
            const eb = getRandomInt(-3, 3);
            currentFunction = x => ea * Math.exp(x) + eb;
            displayEquation(`f(x) = ${ea}·e^x + ${eb}`);
            break;
    }
    
    clearCanvas();
    document.getElementById('submitBtn').disabled = false;
    points = [];
    document.getElementById('score').textContent = '';
}

// Rest of the functions remain exactly the same
function displayEquation(equation) {
    document.getElementById('equation').textContent = equation;
}

function drawFunction(func, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstPoint = true;
    for (let px = 0; px < width; px++) {
        const x = (px - originX) / scaleX;
        const y = func(x);
        
        if (y !== undefined && !isNaN(y) && Math.abs(y) < height/(2*scaleY)) {
            const canvasCoords = toCanvasCoords(x, y);
            if (firstPoint) {
                ctx.moveTo(canvasCoords.x, canvasCoords.y);
                firstPoint = false;
            } else {
                ctx.lineTo(canvasCoords.x, canvasCoords.y);
            }
        } else {
            firstPoint = true;
        }
    }
    ctx.stroke();
}

function calculateR2Score() {
    if (!currentFunction || points.length < 2) return 0;
    
    const actualY = [];
    const predictedY = [];
    
    points.forEach(point => {
        const actual = currentFunction(point.x);
        if (actual !== undefined && !isNaN(actual) && Math.abs(actual) < height/(2*scaleY)) {
            actualY.push(actual);
            predictedY.push(point.y);
        }
    });
    
    if (actualY.length < 2) return 0;
    
    const yMean = actualY.reduce((a, b) => a + b) / actualY.length;
    const tss = actualY.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rss = actualY.reduce((sum, y, i) => sum + Math.pow(y - predictedY[i], 2), 0);
    const r2 = 1 - (rss / tss);
    
    return Math.max(0, Math.min(1, r2));
}

function submitDrawing() {
    if (!currentFunction) return;
    
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    
    drawFunction(currentFunction, '#ff0000');
    
    ctx.strokeStyle = '#2196F3';
    ctx.beginPath();
    points.forEach((point, i) => {
        const canvasCoords = toCanvasCoords(point.x, point.y);
        if (i === 0) {
            ctx.moveTo(canvasCoords.x, canvasCoords.y);
        } else {
            ctx.lineTo(canvasCoords.x, canvasCoords.y);
        }
    });
    ctx.stroke();
    
    const r2Score = calculateR2Score();
    const percentageScore = Math.round(r2Score * 100);
    document.getElementById('score').textContent = `Score: ${percentageScore}%`;
}

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mathCoords = toMathCoords(x, y);
    points.push(mathCoords);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
}

function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mathCoords = toMathCoords(x, y);
    points.push(mathCoords);
    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function clearCanvas() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    points = [];
    document.getElementById('score').textContent = '';
}

function init() {
    clearCanvas();
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
}

init();