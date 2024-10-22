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
                functions.push(x => Math.asin(x/Math.sqrt(1 + x*x)));
                names.push("arcsin(x/√(1+x²))");
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

            // Display the fitted function
            let equation = "f(x) = ";
            coefficients.forEach((coef, i) => {
                if (Math.abs(coef) < 0.0001) return;
                if (i === 0) {
                    equation += coef.toFixed(3);
                } else {
                    equation += (coef >= 0 ? " + " : " - ") + 
                               Math.abs(coef).toFixed(3) + "*" + names[i];
                }
            });
            document.getElementById('equation').textContent = equation;

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
