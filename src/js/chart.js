(function() {
    let currentLocaleData = {}; // Store locale data
    let animationFrameId = null; // For debouncing resize

    // Get both canvas elements
    const canvas1 = document.getElementById('chart-econ-govt');
    const canvas2 = document.getElementById('chart-dipl-scty');
    const context1 = canvas1 ? canvas1.getContext('2d') : null;
    const context2 = canvas2 ? canvas2.getContext('2d') : null;

    if (!canvas1 || !canvas2 || !context1 || !context2) {
        console.error("One or both chart canvas elements not found!");
        return;
    }

    // Listen for language changes from main.js
    window.addEventListener('languageChanged', (event) => {
        console.log("Chart.js received language change event."); // Log event receipt
        if (event.detail && event.detail.localeData) {
            currentLocaleData = event.detail.localeData;
            console.log("Chart.js updated localeData, redrawing charts.");
            drawBothCharts(); // Redraw both charts with new labels
        } else {
            console.warn("Chart.js received languageChanged event without localeData.");
        }
    });

    // Debounced resize handler
    function handleResize() {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = window.requestAnimationFrame(() => {
            // console.log("Chart resize event triggered redraw"); // Reduce console noise
            // Only redraw if locale data is available
            if (currentLocaleData && Object.keys(currentLocaleData).length > 0) {
                 drawBothCharts();
            }
            animationFrameId = null;
        });
    }

    // Function to draw both charts
    function drawBothCharts() {
        // Ensure necessary locale data exists before drawing
        const chartLabels = currentLocaleData?.chartLabels;
        const axisLabelsEcon = currentLocaleData?.axisLabels?.econ; // For chart 1 (fallback names)
        const axisLabelsGovt = currentLocaleData?.axisLabels?.govt; // For chart 1 (fallback names)
        const axisLabelsDipl = currentLocaleData?.axisLabels?.dipl; // For chart 2
        const axisLabelsScty = currentLocaleData?.axisLabels?.scty; // For chart 2

        // More robust check for needed labels
        if (!currentLocaleData || !chartLabels ||
            !axisLabelsDipl?.[0] || !axisLabelsDipl?.[6] || // Check specific needed labels for Dipl
            !axisLabelsScty?.[0] || !axisLabelsScty?.[6]) { // Check specific needed labels for Scty
             console.warn("Locale data not fully ready for drawing charts. Skipping draw.");
             // Optionally clear the canvas or show a placeholder?
             // context1.clearRect(0, 0, canvas1.width, canvas1.height);
             // context2.clearRect(0, 0, canvas2.width, canvas2.height);
             return; // Don't draw if data is missing
        }

        // Chart 1: Econ vs Govt
        const labels1 = {
            // Use specific keys from chartLabels if available, otherwise fallback to axisLabels or defaults
            top: chartLabels?.axisCivilTop ?? axisLabelsGovt?.[5] ?? "Authority", // Index 5 = Authoritarian
            bottom: chartLabels?.axisCivilBottom ?? axisLabelsGovt?.[1] ?? "Liberty", // Index 1 = Libertarian
            left: chartLabels?.axisEconomicLeft ?? axisLabelsEcon?.[1] ?? "Equality", // Index 1 = Socialist (closer to Equality)
            right: chartLabels?.axisEconomicRight ?? axisLabelsEcon?.[5] ?? "Market" // Index 5 = Capitalist (closer to Market)
        };
        drawAxisChart(canvas1, context1, labels1);

        // Chart 2: Dipl vs Scty
        const labels2 = {
            top: axisLabelsScty?.[6] ?? "Tradition",    // Top: Most Traditional (Reactionary)
            bottom: axisLabelsScty?.[0] ?? "Progress", // Bottom: Most Progressive (Revolutionary)
            left: axisLabelsDipl?.[6] ?? "Nation",     // Left: Most Nationalist (Chauvinist)
            right: axisLabelsDipl?.[0] ?? "Globe"      // Right: Most Globalist (Cosmopolitan)
        };
         drawAxisChart(canvas2, context2, labels2);

         // console.log("Both charts drawn/redrawn."); // Reduce console noise
    }


    // Reusable function to draw a single axis chart
    function drawAxisChart(canvas, context, labels) {
        if (!canvas || !context) return;

        // Ensure parent element has rendered for accurate width reading
        const parentWidth = canvas.parentElement.clientWidth;
        if (parentWidth <= 0) {
            // If parent width is 0, try again shortly
            requestAnimationFrame(() => drawAxisChart(canvas, context, labels));
            return;
        }

        // Set canvas size based on parent, with a minimum
        const size = Math.max(150, parentWidth); // Ensure a minimum size
        // Check if size changed significantly to avoid unnecessary redraws/resets
        if (canvas.width !== size) {
            canvas.width = size;
            canvas.height = size; // Keep it square
        } else {
             // If size is the same, just clear existing content
             context.clearRect(0, 0, canvas.width, canvas.height);
        }


        const width = canvas.width;
        const height = canvas.height;
        // Adjust padding based on size
        const padding = Math.max(20, size * 0.12); // Dynamic padding
        const labelOffset = padding * 0.35; // Offset for labels from axis ends

        // Adjust font size based on canvas size
        context.font = `${Math.max(9, size * 0.05)}px 'Source Sans Pro', sans-serif`;

        // --- Grid ---
        drawGrid(context, width, height, 10, padding, '#f0f0f0', 1); // 10x10 grid

        // --- Center Axes ---
        context.beginPath();
        context.lineWidth = 1.5; // Slightly thicker axes
        context.strokeStyle = '#cccccc'; // Grey color for axes
        // Vertical Axis
        context.moveTo(width / 2, padding);
        context.lineTo(width / 2, height - padding);
        // Horizontal Axis
        context.moveTo(padding, height / 2);
        context.lineTo(width - padding, height / 2);
        context.stroke();
        context.closePath();

        // --- Labels ---
        // Top Label (Horizontal)
        drawText(context, { text: labels.top || '', align: 'center', baseline: 'bottom', x: width / 2, y: padding - labelOffset });
        // Bottom Label (Horizontal)
        drawText(context, { text: labels.bottom || '', align: 'center', baseline: 'top', x: width / 2, y: height - padding + labelOffset });
        // Left Label (Vertical, Rotated)
        drawText(context, { text: labels.left || '', align: 'center', baseline: 'middle', x: padding - labelOffset, y: height / 2, rotation: -90 }); // Rotate -90 degrees
        // Right Label (Vertical, Rotated)
        drawText(context, { text: labels.right || '', align: 'center', baseline: 'middle', x: width - padding + labelOffset, y: height / 2, rotation: 90 }); // Rotate 90 degrees
    }

    // --- Helper Functions ---
    function drawGrid(ctx, bw, bh, lines, pad, color, lineWidth) {
        const drawableWidth = bw - (pad * 2);
        const drawableHeight = bh - (pad * 2);
        if (drawableWidth <= 0 || drawableHeight <= 0 || lines <= 0) return;
        const gapX = drawableWidth / lines;
        const gapY = drawableHeight / lines;
        ctx.beginPath(); ctx.lineWidth = lineWidth; ctx.strokeStyle = color;
        // Draw vertical lines
        for (let i = 0; i <= lines; i++) {
            const x = pad + i * gapX; ctx.moveTo(x, pad); ctx.lineTo(x, bh - pad);
        }
        // Draw horizontal lines
        for (let i = 0; i <= lines; i++) {
            const y = pad + i * gapY; ctx.moveTo(pad, y); ctx.lineTo(bw - pad, y);
        }
        ctx.stroke(); ctx.closePath();
   }

   function drawText(ctx, item) {
        ctx.save(); // Save context state before transformation
        ctx.fillStyle = '#555'; // Label color
        ctx.textAlign = item.align || 'center';
        ctx.textBaseline = item.baseline || 'middle';

        // Apply translation and rotation if specified
        if (item.rotation) {
            ctx.translate(item.x, item.y); // Move origin to the point of drawing
            ctx.rotate(item.rotation * Math.PI / 180); // Rotate context
            ctx.fillText(item.text, 0, 0); // Draw text at the (now rotated) origin
        } else {
            ctx.fillText(item.text, item.x, item.y); // Draw text normally
        }

        ctx.restore(); // Restore context state to before transformation
     }

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Initial draw attempt is REMOVED - relies on 'languageChanged' event now
    // setTimeout(drawBothCharts, 100); // REMOVED

}());
