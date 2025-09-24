// app/js/ui.js

export function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f0f4f8'; // Soft light background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawFrame(ctx, canvas) {
  ctx.strokeStyle = '#3b82f6'; // Softer blue frame
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
}

export function drawRobotIdle(ctx, canvas, t = 0) {
  clearCanvas(ctx, canvas);
  drawFrame(ctx, canvas);

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.55;
  const breathe = 1 + Math.sin(t / 800) * 0.02;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(breathe, breathe);

  // body
  ctx.fillStyle = '#64748b'; // Friendly blue-gray
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = '#38bdf8'; // Sky blue
  ctx.beginPath();
  ctx.arc(-25, -15, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(25, -15, 8, 0, Math.PI * 2);
  ctx.fill();

  // smiling mouth
  ctx.beginPath();
  ctx.arc(0, 20, 20, 0, Math.PI);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 4;
  ctx.stroke();

  // antenna
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-2, -110, 4, 30);
  ctx.beginPath();
  ctx.arc(0, -120, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawRobotSpeak(ctx, canvas, text) {
  drawRobotIdle(ctx, canvas);

  const w = canvas.width * 0.8;
  const x = canvas.width * 0.1;
  const y = canvas.height * 0.08;

  ctx.fillStyle = '#ffffff'; // Light speech bubble
  ctx.strokeStyle = '#60a5fa'; // Soft border
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, 120, 16, true, true);

  ctx.fillStyle = '#1f2937'; // Dark text
  ctx.font = 'bold 24px system-ui';
  wrapText(ctx, text, x + 16, y + 36, w - 32, 28);
}

// Helper: rounded rectangle
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Helper: wrap long text
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, yy);
      line = words[n] + ' ';
      yy += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, yy);
}
