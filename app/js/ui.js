// app/js/ui.js
export function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawFrame(ctx, canvas) {
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
}

export function drawRobotIdle(ctx, canvas, t = 0) {
  // simple robot body with gentle breathing
  clearCanvas(ctx, canvas);
  drawFrame(ctx, canvas);

  const cx = canvas.width * 0.5, cy = canvas.height * 0.55;
  const breathe = 1 + Math.sin(t / 800) * 0.02;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(breathe, breathe);
  // body
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
  // eyes
  ctx.fillStyle = '#2dd4bf';
  ctx.beginPath(); ctx.arc(-25, -15, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(25, -15, 8, 0, Math.PI * 2); ctx.fill();
  // antenna
  ctx.fillRect(-2, -110, 4, 30);
  ctx.beginPath(); ctx.arc(0, -120, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawRobotSpeak(ctx, canvas, text) {
  // reuse idle drawing as background
  drawRobotIdle(ctx, canvas);
  // speech bubble
  const w = canvas.width * 0.8, x = canvas.width * 0.1, y = canvas.height * 0.08;
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, 120, 16, true, true);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 24px system-ui';
  wrapText(ctx, text, x + 16, y + 36, w - 32, 28);
}

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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', yy = y;
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
