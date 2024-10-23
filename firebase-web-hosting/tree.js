const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let points = [];
        let isDrawing = false;
        const width = canvas.width;
        const height = canvas.height;
        const scaleX = 50; // pixels per unit
        const scaleY = 50;
        const originX = width / 2;
        const originY = height / 2;
        const style = document.createElement('style');
style.textContent = `
    #equation {
        width: 100%;
        height: 200px;
        margin: 1rem auto;
        padding: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: white;
        overflow: hidden;
        position: relative;
    }
    
    #equation > * {
        max-width: 100%;
        max-height: 100%;
    }
    
    .MathJax {
        display: block !important;
        margin: 0 auto !important;
    }
    
    .MathJax_Display {
        margin: 0 !important;
        max-width: 100%;
    }
`;
document.head.appendChild(style);

// Initialize container with placeholder
document.addEventListener('DOMContentLoaded', () => {
    const equationElement = document.getElementById('equation');
    if (equationElement) {
        equationElement.textContent = '\\begin{gathered} f(x) = ? \\end{gathered}';
        if (window.MathJax) {
            MathJax.typesetPromise([equationElement]);
        }
    }
});
        window.MathJax = {
            tex: {
                packages: ['base', 'ams'],
                inlineMath: [['$', '$']],
                displayMath: [['$$', '$$']],
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
            },
            svg: {
                fontCache: 'global'
            }
        };
        // Draw coordinate system
        function drawGrid() {
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;

            // Draw grid lines
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

            // Draw axes
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

        function getBasisFunctions() {
            const functions = [];
            const names = [];

            // Constant term
            functions.push(x => 1);
            names.push("1");

            if (document.getElementById('polynomial').checked) {
                for (let i = 1; i <= 3; i++) {
                    functions.push(x => Math.pow(x, i));
                    names.push(`x^${i}`);
                }
            }

            if (document.getElementById('negativePolynomial').checked) {
                for (let i = 1; i <= 2; i++) {
                    functions.push(x => Math.pow(x, -i));
                    names.push(`x^-${i}`);
                }
            }

            if (document.getElementById('trig').checked) {
                functions.push(x => Math.sin(x));
                names.push("sin(x)");
                functions.push(x => Math.cos(x));
                names.push("cos(x)");
                functions.push(x => Math.sin(2*x));
                names.push("sin(2x)");
                functions.push(x => Math.cos(2*x));
                names.push("cos(2x)");
            }

            if (document.getElementById('inverseTrig').checked) {
                functions.push(x => Math.atan(x));
                names.push("arctan(x)");
            }

            if (document.getElementById('exponential').checked) {
                functions.push(x => Math.exp(x));
                names.push("e^x");
                functions.push(x => Math.exp(-x));
                names.push("e^-x");
            }
            return { functions, names };
        }

        function init() {
            clearCanvas();
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
        }

        function clearCanvas() {
            ctx.clearRect(0, 0, width, height);
            drawGrid();
            points = [];
            document.getElementById('equation').textContent = '';
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

        function termToLatex(term) {
            return term
                .replace(/\^(\d+)/g, '^{$1}')
                .replace(/x\^-(\d+)/g, 'x^{-$1}')
                .replace(/sin\(x\)/g, '\\sin(x)')
                .replace(/cos\(x\)/g, '\\cos(x)')
                .replace(/sin\(2x\)/g, '\\sin(2x)')
                .replace(/cos\(2x\)/g, '\\cos(2x)')
                .replace(/arctan\(x\)/g, '\\arctan(x)')
                .replace(/e\^x/g, 'e^{x}')
                .replace(/e\^-x/g, 'e^{-x}');
        }
        

        function fitCurve() {
            if (points.length < 2) return;

            const { functions, names } = getBasisFunctions();
            
            // Prepare matrices for regression
            const X = [];
            const y = [];
            points.forEach(point => {
                const row = functions.map(f => {
                    try {
                        return f(point.x);
                    } catch {
                        return 0;
                    }
                });
                X.push(row);
                y.push([point.y]);
            });

            // Solve normal equations with regularization
            const Xt = numeric.transpose(X);
            const XtX = numeric.add(numeric.dot(Xt, X), numeric.mul(0.0001, numeric.identity(functions.length)));
            const Xty = numeric.dot(Xt, y);
            const coefficients = numeric.solve(XtX, Xty);

            let terms = [];
    
            coefficients.forEach((coef, i) => {
                if (Math.abs(coef) < 0.0001) return;
                
                let term = '';
                if (i === 0) {
                    term = coef.toFixed(3);
                } else {
                    const absCoef = Math.abs(coef).toFixed(3);
                    // Only show coefficient if it's not 1
                    const coefStr = absCoef === '1.000' ? '' : absCoef;
                    term = coefStr + (coefStr ? '\\,' : '') + termToLatex(names[i]);
                }
                terms.push({ 
                    value: term, 
                    isPositive: coef >= 0 
                });
            });

             // Determine optimal terms per line based on total terms
    const totalTerms = terms.length;
    let TERMS_PER_LINE = 3; // Default
    if (totalTerms > 12) TERMS_PER_LINE = 4;
    if (totalTerms > 16) TERMS_PER_LINE = 5;

    // Group terms into lines
    let lines = [];
    let currentLine = [];
    
    terms.forEach((term, i) => {
        if (i === 0) {
            // First line starts with f(x) =
            currentLine.push(`f(x) = ${term.value}`);
        } else if (currentLine.length === 0) {
            // Start subsequent lines with proper alignment
            currentLine.push(`\\quad ${term.isPositive ? '+' : '-'} ${term.value}`);
        } else {
            // Middle terms in a line
            currentLine.push(`${term.isPositive ? '+' : '-'} ${term.value}`);
        }
        
        if (currentLine.length === TERMS_PER_LINE && i < terms.length - 1) {
            lines.push(currentLine.join(' '));
            currentLine = [];
        }
    });
    
    if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
    }

    // Construct the final LaTeX equation
    const latexEquation = `\\begin{gathered}
${lines.join(' \\\\\n')}
\\end{gathered}`;
    
    // Update the display
    const equationElement = document.getElementById('equation');
    equationElement.textContent = latexEquation;
    
    if (window.MathJax) {
        MathJax.typesetPromise([equationElement]).then(() => {
            // After rendering, check if equation overflows and adjust if needed
            const mathJaxOutput = equationElement.querySelector('.MathJax');
            if (mathJaxOutput) {
                const scale = Math.min(
                    equationElement.offsetWidth / mathJaxOutput.offsetWidth,
                    equationElement.offsetHeight / mathJaxOutput.offsetHeight
                );
                if (scale < 1) {
                    mathJaxOutput.style.transform = `scale(${scale})`;
                    mathJaxOutput.style.transformOrigin = 'center center';
                }
            }
        });
    }

            // Draw the fitted curve
            ctx.clearRect(0, 0, width, height);
            drawGrid();
            
            // Draw original points
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
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

            // Draw fitted curve
            ctx.strokeStyle = '#ff0000';
            ctx.beginPath();
            let firstPoint = true;
            for (let px = 0; px < width; px++) {
                const x = (px - originX) / scaleX;
                let y = 0;
                try {
                    for (let i = 0; i < functions.length; i++) {
                        y += coefficients[i] * functions[i](x);
                    }
                    const canvasCoords = toCanvasCoords(x, y);
                    if (firstPoint) {
                        ctx.moveTo(canvasCoords.x, canvasCoords.y);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(canvasCoords.x, canvasCoords.y);
                    }
                } catch {
                    firstPoint = true;
                }
            }
            ctx.stroke();
        }
        init();
