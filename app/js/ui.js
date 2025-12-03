// app/js/ui.js

/* ---------- THEME / PALETTE ---------- */
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

let robotWaveFrames = [];
let robotFunFrames = [];
let robotIdleImage = null;
let robotTalkImage = null;


/* ---------- Load images ---------- */
export async function loadRobotImages() {
  const idle = new Image();
  const talk = new Image();
  const wave1 = new Image();
  const wave2 = new Image();
  const wave3 = new Image();

  idle.src = './assets/robot/robot_idle.png';
  talk.src = './assets/robot/robot_talking.png';
  wave1.src = './assets/robot/robot_wave1.png';
  wave2.src = './assets/robot/robot_wave2.png';
  wave3.src = './assets/robot/robot_wave3.png';

  await Promise.all([
    new Promise(res => idle.onload = res),
    new Promise(res => talk.onload = res),
    new Promise(res => wave1.onload = res),
    new Promise(res => wave2.onload = res),
    new Promise(res => wave3.onload = res),
  ]);

  robotIdleImage = idle;
  robotTalkImage = talk;
  robotWaveFrames = [wave1, wave2, wave3];


  console.log("Robot images loaded");
}

let robotBlinkImage = null;

export async function loadBlinkImage() {
  const img = new Image();
  img.src = './assets/robot/blink.png';

  await new Promise(res => img.onload = res);

  robotBlinkImage = img;
  console.log("Blink image loaded");
}

let twoFrameAnimationImages = [];

export async function loadTwoFrameAnimation() {
  const paths = [
    './assets/robot/two_1.png',
    './assets/robot/two_2.png'
  ];

  const loaders = paths.map(src => {
    return new Promise(res => {
      const img = new Image();
      img.onload = res;
      img.src = src;
      twoFrameAnimationImages.push(img);
    });
  });

  await Promise.all(loaders);
}

export function drawTwoFrameAnimation(ctx, canvas, frameIndex = 0) {
  if (!twoFrameAnimationImages.length) return;
  const img = twoFrameAnimationImages[frameIndex % twoFrameAnimationImages.length];
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}




/* ---------- NEW: Load 7 FUN images ---------- */
export async function loadFunImages() {
  const paths = [
    './assets/robot/fun1.png',
    './assets/robot/fun2.png',
    './assets/robot/fun3.png',
    './assets/robot/fun4.png',
    './assets/robot/fun5.png',
    './assets/robot/fun6.png',
    './assets/robot/fun7.png'
  ];

  const loaders = paths.map(p => {
    return new Promise(res => {
      const img = new Image();
      img.onload = res;
      img.src = p;
      robotFunFrames.push(img);
    });
  });

  await Promise.all(loaders);
  console.log("FUN animation images loaded");
}

/* ---------- Drawing functions ---------- */
export function drawRobotWave(ctx, canvas, frameIndex = 0) {
  const img = robotWaveFrames[frameIndex % robotWaveFrames.length];
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

export function drawRobotFun(ctx, canvas, frameIndex = 0) {
  const img = robotFunFrames[frameIndex % robotFunFrames.length];
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

/* ---------- Canvas sizing ---------- */
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

/* ---------- Helpers ---------- */
export function clearCanvas(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawRobotIdle(ctx, canvas) {
  ctx.drawImage(robotIdleImage, 0, 0, canvas.width, canvas.height);
}

export function drawRobotBlink(ctx, canvas) {
  if (!robotBlinkImage) return;
  ctx.drawImage(robotBlinkImage, 0, 0, canvas.width, canvas.height);
}


export function drawRobotSpeak(ctx, canvas, text) {
  ctx.drawImage(robotTalkImage, 0, 0, canvas.width, canvas.height);

  const w = canvas.width * 0.8;
  const x = canvas.width * 0.1;
  const y = canvas.height * 0.08;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, 120, 16, true, true);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px system-ui, sans-serif';
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

/* Cover image loader (unchanged) */
let robotImage = null;
let robotImageReady = false;

export function loadRobotImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      robotImage = img;
      robotImageReady = true;
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = path;
  });
}

export function drawRobotImage(ctx, canvas) {
  if (!robotImageReady || !robotImage) return;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const imgW = robotImage.width;
  const imgH = robotImage.height;
  const scale = Math.max(w / imgW, h / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const x = (w - drawW) / 2;
  const y = (h - drawH) / 2;
  ctx.drawImage(robotImage, x, y, drawW, drawH);
}

