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
        console.log("Chart.js received language change");
        currentLocaleData = event.detail.localeData || {};
        drawBothCharts(); // Redraw both charts with new labels
    });

    // Debounced resize handler
    function handleResize() {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = window.requestAnimationFrame(() => {
            // console.log("Chart resize event triggered redraw"); // Reduce console noise
            drawBothCharts();
            animationFrameId = null;
        });
    }

    // Function to draw both charts
    function drawBothCharts() {
        const chartLabels = currentLocaleData?.chartLabels;
        const axisLabels = currentLocaleData?.axisLabels;

        if (!currentLocaleData || !chartLabels || !axisLabels?.dipl?.[0] || !axisLabels?.scty?.[0]) {
             console.warn("Locale data not fully ready for drawing charts.");
        }

        // Chart 1: Econ vs Govt
        const labels1 = {
            top: chartLabels?.axisCivilTop ?? "Authority",
            bottom: chartLabels?.axisCivilBottom ?? "Liberty",
            left: chartLabels?.axisEconomicLeft ?? "Equality",
            right: chartLabels?.axisEconomicRight ?? "Market"
        };
        drawAxisChart(canvas1, context1, labels1);

        // Chart 2: Dipl vs Scty
        const labels2 = {
            top: axisLabels?.scty?.[6] ?? "Tradition",    // Top: Most Traditional
            bottom: axisLabels?.scty?.[0] ?? "Progress", // Bottom: Most Progressive
            left: axisLabels?.dipl?.[6] ?? "Nation",     // Left: Most Nationalist
            right: axisLabels?.dipl?.[0] ?? "Globe"      // Right: Most Globalist
        };
         drawAxisChart(canvas2, context2, labels2);

         // console.log("Both charts drawn/redrawn."); // Reduce console noise
    }


    // Reusable function to draw a single axis chart
    function drawAxisChart(canvas, context, labels) {
        if (!canvas || !context) return;

        const parentWidth = canvas.parentElement.clientWidth;
        const size = Math.max(150, parentWidth);
        canvas.width = size;
        canvas.height = size;

        const width = canvas.width;
        const height = canvas.height;
        // Increase padding slightly to give rotated labels more space
        const padding = Math.max(20, size * 0.12); // Increased padding
        const labelOffset = padding * 0.3; // Adjust offset as needed

        // Clear canvas
        context.clearRect(0, 0, width, height);
        // Adjust font size based on canvas size
        context.font = `${Math.max(9, size * 0.05)}px 'Source Sans Pro', sans-serif`;

        // --- Grid ---
        drawGrid(context, width, height, 10, padding, '#f0f0f0', 1);

        // --- Center Axes ---
        context.beginPath();
        context.lineWidth = 1.5;
        context.strokeStyle = '#cccccc';
        context.moveTo(width / 2, padding); context.lineTo(width / 2, height - padding); // Vertical
        context.moveTo(padding, height / 2); context.lineTo(width - padding, height / 2); // Horizontal
        context.stroke(); context.closePath();

        // --- Labels ---
        // Top and Bottom labels (Horizontal)
        drawText(context, { text: labels.top || '', align: 'center', baseline: 'bottom', x: width / 2, y: padding - labelOffset });
        drawText(context, { text: labels.bottom || '', align: 'center', baseline: 'top', x: width / 2, y: height - padding + labelOffset });

        // Left Label (Vertical)
        drawText(context, { text: labels.left || '', align: 'center', baseline: 'middle', x: padding - labelOffset, y: height / 2, rotation: -90 }); // Rotate -90 degrees

        // Right Label (Vertical)
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
        for (let i = 0; i <= lines; i++) {
            const x = pad + i * gapX; ctx.moveTo(x, pad); ctx.lineTo(x, bh - pad);
        }
        for (let i = 0; i <= lines; i++) {
            const y = pad + i * gapY; ctx.moveTo(pad, y); ctx.lineTo(bw - pad, y);
        }
        ctx.stroke(); ctx.closePath();
   }

   function drawText(ctx, item) {
        ctx.save(); // Save context state
        ctx.fillStyle = '#555'; // Label color
        ctx.textAlign = item.align || 'center';
        ctx.textBaseline = item.baseline || 'middle';

        // Apply translation and rotation if specified
        if (item.rotation) {
            ctx.translate(item.x, item.y); // Move origin to label position
            ctx.rotate(item.rotation * Math.PI / 180); // Rotate
            ctx.fillText(item.text, 0, 0); // Draw text at the (rotated) origin
        } else {
            ctx.fillText(item.text, item.x, item.y); // Draw horizontally
        }

        ctx.restore(); // Restore context state
     }

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Initial draw attempt
    setTimeout(drawBothCharts, 100);

}());
