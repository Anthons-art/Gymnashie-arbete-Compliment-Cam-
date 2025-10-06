/* ui.js  ----------------
   Canvas UI helpers for robot drawing
*/

// ---------- PALETTE ----------
const PALETTE = {
  bg: '#f0f4f8',
  frame: '#3b82f6',
  body: '#64748b',
  eyes: '#38bdf8',
  mouth: '#0f172a',
  bubbleBg: '#ffffff',
  bubbleBorder: '#60a5fa',
  bubbleText: '#0f172a'
};

// ---------- CANVAS ----------
export function fitCanvasToScreen(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  clearCanvas(ctx, canvas);
  return ctx;
}

// ---------- DRAW ----------
export function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio||1), canvas.height / (window.devicePixelRatio||1));
}

export function drawFrame(ctx, canvas) {
  ctx.strokeStyle = PALETTE.frame;
  ctx.lineWidth = 6;
  const w = canvas.width / (window.devicePixelRatio||1);
  const h = canvas.height / (window.devicePixelRatio||1);
  ctx.strokeRect(8, 8, w - 16, h - 16);
}

export function drawRobotIdle(ctx, canvas, t = 0) {
  clearCanvas(ctx, canvas);
  drawFrame(ctx, canvas);
  const w = canvas.width / (window.devicePixelRatio||1);
  const h = canvas.height / (window.devicePixelRatio||1);
  const cx = w * 0.5;
  const cy = h * 0.55;
  const breathe = 1 + Math.sin(t / 800) * 0.02;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(breathe, breathe);
  ctx.fillStyle = PALETTE.body;
  ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.eyes;
  ctx.beginPath(); ctx.arc(-25, -15, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(25, -15, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 20, 20, 0, Math.PI); ctx.strokeStyle = PALETTE.frame; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = PALETTE.eyes; ctx.fillRect(-2, -110, 4, 30); ctx.beginPath(); ctx.arc(0, -120, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawRobotSpeak(ctx, canvas, text) {
  drawRobotIdle(ctx, canvas);
  const w = (canvas.width / (window.devicePixelRatio||1)) * 0.8;
  const x = (canvas.width / (window.devicePixelRatio||1)) * 0.1;
  const y = (canvas.height / (window.devicePixelRatio||1)) * 0.08;
  ctx.fillStyle = PALETTE.bubbleBg;
  ctx.strokeStyle = PALETTE.bubbleBorder;
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, 120, 16, true, true);
  ctx.fillStyle = PALETTE.bubbleText;
  ctx.font = 'bold 24px system-ui, sans-serif';
  wrapText(ctx, text, x + 16, y + 36, w - 32, 28);
}

// ---------- HELPERS ----------
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

// ---------- INIT ----------
export function initUI(canvas) {
  const ctx = fitCanvasToScreen(canvas);
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      fitCanvasToScreen(canvas);
    }, 120);
  });
  return ctx;
}
