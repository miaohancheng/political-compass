(function() {
  const canvas = document.getElementById('chart');
  if (!canvas) {
      console.error("Chart canvas element not found!");
      return;
  }
  const context = canvas.getContext('2d');
  let currentLocaleData = {}; // Store locale data
  let animationFrameId = null; // For debouncing resize

  // Listen for language changes from main.js
  window.addEventListener('languageChanged', (event) => {
      console.log("Chart.js received language change");
      currentLocaleData = event.detail.localeData || {};
      drawChart(); // Redraw chart with new labels
  });

  // Debounced resize handler
  function handleResize() {
      // Cancel previous frame
      if (animationFrameId) {
          window.cancelAnimationFrame(animationFrameId);
      }
      // Request new frame
      animationFrameId = window.requestAnimationFrame(() => {
          console.log("Chart resize event triggered redraw");
          drawChart();
          animationFrameId = null; // Reset ID after execution
      });
  }

  function drawChart() {
    // Ensure canvas and parent node exist
    if (!canvas || !canvas.parentNode) {
        console.warn("Canvas or parent node not available for drawing.");
        return;
    }

    // Set canvas dimensions based on parent container width for responsiveness
    // Maintain a square aspect ratio
    const parentWidth = canvas.parentNode.clientWidth;
    const size = Math.max(150, parentWidth * 0.9); // Ensure a minimum size, use 90% width
    canvas.width = size;
    canvas.height = size;

    const width = canvas.width;
    const height = canvas.height;
    const padding = Math.max(15, size * 0.05); // Responsive padding (5% of size, min 15px)

    // Clear canvas
    context.clearRect(0, 0, width, height);
    context.font = `${Math.max(10, size * 0.03)}px 'Source Sans Pro', sans-serif`; // Responsive font size

    // --- Grid ---
    drawGrid(width, height, 10, padding, '#f0f0f0', 1); // Lighter grid lines

    // --- Center Axes ---
    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = '#cccccc'; // Slightly darker axis lines
    // Vertical Axis
    context.moveTo(width / 2, padding);
    context.lineTo(width / 2, height - padding);
    // Horizontal Axis
    context.moveTo(padding, height / 2);
    context.lineTo(width - padding, height / 2);
    context.stroke();
    context.closePath();


    // --- Labels based on 2D Compass using 8values axes ---
    // Get translated labels from localeData, provide sensible fallbacks
    const labelsData = currentLocaleData.chartLabels || {};
    const econLeftLabel = labelsData.axisEconomicLeft || "Equality";
    const econRightLabel = labelsData.axisEconomicRight || "Market";
    const authTopLabel = labelsData.axisCivilTop || "Authority"; // Top (govt=0)
    const libBottomLabel = labelsData.axisCivilBottom || "Liberty"; // Bottom (govt=100)

    // Define labels for the four axis ends
    // Adjust positioning slightly away from the edges/center lines
    const labelOffset = padding * 1.5; // Offset labels from the very edge/center

    const labels = [
       // Axis End Labels
       { text: authTopLabel,   align: 'center', baseline: 'bottom', x: width / 2,       y: padding - 5,       r: 0 }, // Top Center (slightly above top padding)
       { text: libBottomLabel, align: 'center', baseline: 'top',    x: width / 2,       y: height - padding + 5, r: 0 }, // Bottom Center (slightly below bottom padding)
       { text: econLeftLabel,  align: 'right',  baseline: 'middle', x: padding - 5,       y: height / 2,      r: 0 }, // Left Middle (slightly left of padding)
       { text: econRightLabel, align: 'left',   baseline: 'middle', x: width - padding + 5, y: height / 2,      r: 0 }, // Right Middle (slightly right of padding)
     ];

    // Draw the labels
    labels.forEach(function(label) {
      drawText(label);
    });

    console.log("Chart drawn/redrawn.");
  }

  // --- Helper Functions ---

  function drawGrid(bw, bh, lines, pad, color, lineWidth) {
        // Calculate gap based on drawable area
        const drawableWidth = bw - (pad * 2);
        const drawableHeight = bh - (pad * 2);
        if (drawableWidth <= 0 || drawableHeight <= 0 || lines <= 0) return; // Prevent errors

        const gapX = drawableWidth / lines;
        const gapY = drawableHeight / lines;

        context.beginPath();
        context.lineWidth = lineWidth;
        context.strokeStyle = color;

        // Vertical lines
        for (let i = 0; i <= lines; i++) {
            const x = pad + i * gapX;
            context.moveTo(x, pad);
            context.lineTo(x, bh - pad);
        }
        // Horizontal lines
        for (let i = 0; i <= lines; i++) {
            const y = pad + i * gapY;
            context.moveTo(pad, y);
            context.lineTo(bw - pad, y);
        }
        context.stroke();
        context.closePath();
   }

   function drawText(item) {
        context.save();
        context.textAlign = item.align || 'center';
        context.textBaseline = item.baseline || 'middle';
        context.fillStyle = '#555'; // Label color
        // Use the globally set font size
        // context.font = '12px sans-serif'; // Or set specific size here

        const x = item.x;
        const y = item.y;
        const rotation = item.r || 0; // Rotation in degrees

         // Apply rotation if specified
         if (rotation !== 0) {
             context.translate(x, y);
             context.rotate(rotation * Math.PI / 180);
             context.fillText(item.text, 0, 0); // Draw at the rotated origin
         } else {
             context.fillText(item.text, x, y); // Draw directly at coordinates
         }

         context.restore();
     }

  // Add resize listener
  window.addEventListener('resize', handleResize);

  // Initial draw (might happen before language data is ready, but will redraw on languageChanged event)
  // Add a small delay to allow main.js to potentially fire the first languageChanged event
  setTimeout(drawChart, 50);


}());
