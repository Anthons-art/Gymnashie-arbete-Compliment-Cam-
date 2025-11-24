// =========================
// IMPORTS
// =========================
import { initDetection, detectFacesAsync, isReady } from './detection.js';
import { initCompliments, randomCompliment, randomComplimentByTime, randomGroupCompliment } from './compliments.js';
import { initUI, clearCanvas, drawFrame, drawRobotIdle, drawRobotSpeak } from './ui.js';
import { initTTS } from './tts.js';
import { cfg } from './config.js';
import { loadRobotImages, drawRobotImage } from './ui.js';
import { initAudio, playAudioByName } from './audio.js';


// =========================
// DOM ELEMENTS
// =========================
const canvas = document.getElementById('canvas');
const ctx = initUI(canvas);
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const retryBtn = document.getElementById('retry');
const adminLink = document.getElementById('adminLink');


// =========================
// STATE VARIABLES
// =========================
let video = null;
let started = false;
let stableCounter = 0;
const STABLE_FRAMES = 5;

let currentRobotImgState = "idle";
let currentCompliment = ''; 

let state = 'idle';
let stateUntil = 0;

let latestDetection = { count: 0, detections: [] };
let runningDetection = false;

const frameHistory = [];
const historyLen = cfg.detection.stableFrames || 12;
const requiredHits = Math.ceil(historyLen * 0.75);

let silenceMode = false;
let silenceStart = 0;
const SILENCE_DURATION = 20000;


// =========================
// UTILITY FUNCTIONS
// =========================
function showOverlay(title, msg) {
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMsg').textContent = msg;
  overlay.style.display = 'flex';
}
function hideOverlay() { overlay.style.display = 'none'; }

function setState(s, ms = 0) {
  state = s;
  stateUntil = performance.now() + ms;
}
function inCooldown() {
  return performance.now() < stateUntil;
}

// Greeting stats
function incGreetingCount() {
  const d = (new Date()).toISOString().slice(0, 10);
  const raw = localStorage.getItem('greetStats') || '{}';
  const stats = JSON.parse(raw);
  stats[d] = (stats[d] || 0) + 1;
  localStorage.setItem('greetStats', JSON.stringify(stats));
}
function getStats() {
  return JSON.parse(localStorage.getItem('greetStats') || '{}');
}


// =========================
// CAMERA INIT
// =========================
async function initCamera() {
  video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.autoplay = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });

  video.srcObject = stream;
  await video.play();
}


// =========================
// DETECTION LOGIC
// =========================
function detectionIsValid(det, canvasWidth, canvasHeight, config) {
  const [x1, y1] = det.topLeft;
  const [x2, y2] = det.bottomRight;
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const cx = x1 + w / 2;
  const cy = y1 + h / 2;

  const roi = {
    xMin: canvasWidth * 0.15,
    xMax: canvasWidth * 0.85,
    yMin: canvasHeight * 0.15,
    yMax: canvasHeight * 0.85
  };

  const insideROI = cx >= roi.xMin && cx <= roi.xMax && cy >= roi.yMin && cy <= roi.yMax;
  const minFacePixels = canvasWidth * config.minFaceFrac;
  const bigEnough = w >= minFacePixels;
  const probOk = (det.probability ?? 0) >= config.minProbability;

  return insideROI && bigEnough && probOk;
}

function countValidDetections(detections, canvas) {
  if (!detections || !detections.length) return 0;
  return detections.filter(d => detectionIsValid(d, canvas.width, canvas.height, cfg.detection)).length;
}

function pushFrame(validCount) {
  frameHistory.push(validCount > 0 ? 1 : 0);
  if (frameHistory.length > historyLen) frameHistory.shift();
}
function stableDetected() {
  if (frameHistory.length < historyLen) return false;
  return frameHistory.reduce((a, b) => a + b, 0) >= requiredHits;
}

async function detectionWorker() {
  if (!runningDetection && isReady()) {
    runningDetection = true;
    try {
      latestDetection = await detectFacesAsync();
    } catch (e) {
      latestDetection = { count: 0, detections: [] };
      console.warn('detectionWorker error', e);
    }
    runningDetection = false;
  }
  setTimeout(detectionWorker, 80);
}


// =========================
// ROBOT LOGIC
// =========================
function triggerComplimentFlow(compliment) {
  currentCompliment = compliment.text;
  drawRobotSpeak(ctx, canvas, compliment.text);

  incGreetingCount();
  
  const duration = Math.max(3500, compliment.text.length * 240);
  playAudioByName(compliment.text);

  setState('talking', duration);

  setTimeout(() => { setState('idle'); }, duration);
}


function updateStateWithFace(faceCount) {
  if (faceCount > 0) stableCounter++;
  else {
    stableCounter = 0;
    silenceMode = false;
  }

  if (silenceMode) return;

  switch (state) {
    case 'idle':
      if (stableCounter >= STABLE_FRAMES) setState('wave', 400);
      break;

    case 'wave':
      if (performance.now() >= stateUntil) {
        let text;

        if (faceCount > 1) {
          text = randomGroupCompliment();
        } else if (stableCounter > 100) {
          text = randomCompliment('studie');
          stableCounter = 0;
        } else {
          text = randomComplimentByTime();
        }

        triggerComplimentFlow(text);

        silenceMode = false;
        silenceStart = performance.now();

        setTimeout(() => {
          if (stableCounter === 0) silenceMode = false;
        }, SILENCE_DURATION);
      }
      break;

    case 'cooldown':
      if (performance.now() >= stateUntil) setState('idle');
      break;
  }
}


// =========================
// MAIN LOOP
// =========================
function loop(t) {
  if (!started) return;

  clearCanvas(ctx, canvas);

  if (typeof drawRobotImage === 'function') drawRobotImage(ctx, canvas);

  if (state === 'talking') drawRobotSpeak(ctx, canvas, currentCompliment);
  else drawRobotIdle(ctx, canvas, t);

  const { detections } = latestDetection;
  const validCount = countValidDetections(detections, canvas);

  pushFrame(validCount);

  if (!inCooldown() && stableDetected()) {
    if (state === 'idle') setState('wave', cfg.timings.wave || 400);
    frameHistory.length = 0;
  }

  updateStateWithFace(validCount);

  requestAnimationFrame(loop);
}


// =========================
// BOOT SEQUENCE (AUTO-START)
// =========================
async function boot() {
  try {
    hideOverlay();
    statusEl.textContent = 'Initierar kamera...';
    await initCamera();

    statusEl.textContent = 'Initierar detektor...';
    await initDetection(video);
    detectionWorker();

    statusEl.textContent = 'Initierar komplimanger...';
    await initCompliments();

    statusEl.textContent = 'Laddar robotbilder...';
    await loadRobotImages().catch(() => {});

    statusEl.textContent = 'Initierar röst...';
    await initTTS().catch(() => {});

    statusEl.textContent = 'Laddar ljud...';
    await initAudio();

    statusEl.textContent = 'Startar system...';

    // AUTO-START THE LOOP
    started = true;
    requestAnimationFrame(loop);

  } catch (e) {
    console.error('Boot failed', e);
    showOverlay(
      'Fel vid uppstart',
      'Kunde inte starta kamera eller ladda modeller. Kontrollera rättigheter och nätverk.'
    );
  }
}


// =========================
// EVENTS (NO START BUTTON)
// =========================
retryBtn.addEventListener('click', async () => {
  overlay.style.display = 'none';
  await boot();
});

adminLink.addEventListener('click', (e) => {
  e.preventDefault();
  const stats = getStats();
  alert('Greet stats (local):\n' + JSON.stringify(stats, null, 2));
});

// Auto-boot direkt på sidladdning
boot();
