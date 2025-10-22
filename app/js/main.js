// =========================
// IMPORTS
// =========================
import { initDetection, detectFacesAsync, isReady } from './detection.js';
import { initCompliments, randomCompliment } from './compliments.js';
import { initUI, clearCanvas, drawFrame, drawRobotIdle, drawRobotSpeak } from './ui.js';
import { initTTS, speak as ttsSpeak } from './tts.js';
import { cfg } from './config.js';
import { loadRobotImage, drawRobotImage } from './ui.js';
import { initAudio, playAudioByName } from './audio.js';


// =========================
// DOM ELEMENTS
// =========================
const canvas = document.getElementById('canvas');
const ctx = initUI(canvas);
const startBtn = document.getElementById('start');
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

let currentCompliment = ''; 

let state = 'idle';
let stateUntil = 0;

let latestDetection = { count: 0, detections: [] };
let runningDetection = false;

const frameHistory = [];
const historyLen = cfg.detection.stableFrames || 12;
const requiredHits = Math.ceil(historyLen * 0.75);


// =========================
// UTILITY FUNCTIONS
// =========================

// Overlay helpers
function showOverlay(title, msg) {
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMsg').textContent = msg;
  overlay.style.display = 'flex';
}
function hideOverlay() {
  overlay.style.display = 'none';
}

// State helpers
function setState(s, ms = 0) {
  state = s;
  stateUntil = performance.now() + ms;
}
function inCooldown() {
  return performance.now() < stateUntil;
}

// Greeting stats (localStorage)
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

// Kontrollera om detektion är relevant
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

// Räkna giltiga detektioner
function countValidDetections(detections, canvas) {
  if (!detections || !detections.length) return 0;
  return detections.filter(d => detectionIsValid(d, canvas.width, canvas.height, cfg.detection)).length;
}

// Frame history / smoothing
function pushFrame(validCount) {
  frameHistory.push(validCount > 0 ? 1 : 0);
  if (frameHistory.length > historyLen) frameHistory.shift();
}
function stableDetected() {
  if (frameHistory.length < historyLen) return false;
  return frameHistory.reduce((a, b) => a + b, 0) >= requiredHits;
}

// Detection worker
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
// ROBOT / COMPLIMENT FLOW
// =========================
function triggerComplimentFlow(compliment) {
  currentCompliment = compliment.text;
  drawRobotSpeak(ctx, canvas, compliment.text);
  incGreetingCount();

  // Om det finns ett specifikt ljud → spela det
  if (compliment.audio) {
    const audio = new Audio(`./assets/sfx/${compliment.audio}`);
    audio.play().catch(e => console.warn('Audio play failed', e));
  } else {
    // fallback till TTS eller slumpat ljud
    playAudioByName(compliment.text);
  }

  const duration = Math.max(3500, compliment.text.length * 240);
  setState('cooldown', duration);
}




function updateStateWithFace(faceCount) {
  if (faceCount > 0) stableCounter++;
  else stableCounter = 0;

  switch (state) {
    case 'idle':
      if (stableCounter >= STABLE_FRAMES) setState('wave', 400);
      break;
    case 'wave':
      if (performance.now() >= stateUntil) {
        const compliment = randomCompliment();
        triggerComplimentFlow(compliment);
      }
      break;
    case 'cooldown':
      if (performance.now() >= stateUntil) setState('idle', 0);
      break;
  }
}



// =========================
// MAIN LOOP
// =========================
function loop(t) {
  if (!started) return;

  // Rensa canvasen
  clearCanvas(ctx, canvas);

  // Rita robotbild som bakgrund (om laddad)
  if (typeof drawRobotImage === 'function') {
    drawRobotImage(ctx, canvas);
  }

  // Hämta senaste detektion
  const { detections } = latestDetection;
  const validCount = countValidDetections(detections, canvas);

  pushFrame(validCount);
  if (!inCooldown() && stableDetected()) {
    if (state === 'idle') setState('wave', cfg.timings.wave || 400);
    frameHistory.length = 0;
  }

  updateStateWithFace(latestDetection.count);

  // Om den pratar – rita talbubblan ovanpå
  if (state === 'cooldown' && latestDetection.count > 0) {
  drawRobotSpeak(ctx, canvas, currentCompliment); // visa samma komplimang
  } 



  requestAnimationFrame(loop);
}



// =========================
// BOOT SEQUENCE
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

        statusEl.textContent = 'Laddar robotbild...';
    try {
      await loadRobotImage('./assets/robot/robot.png');
      statusEl.textContent = 'Robotbild laddad';
    } catch (e) {
      console.warn('Robot image load failed', e);
      // vi fortsätter ändå utan bild
      statusEl.textContent = 'Robotbild kunde inte laddas';
    }
    
    statusEl.textContent = 'Initierar röst (TTS)...';
    await initTTS().catch(() => {});

    statusEl.textContent = 'Laddar ljudfiler...';
    await initAudio();


    statusEl.textContent = 'Klar – tryck Starta';
    startBtn.disabled = false;
    console.log('Boot complete');
  } catch (e) {
    console.error('Boot failed', e);
    showOverlay(
      'Fel vid uppstart',
      'Kan inte starta kamera eller ladda modell. Kontrollera kamera-tillstånd och internet (för första laddning av modell).'
    );
    startBtn.disabled = false;
  }
}


// =========================
// EVENT HANDLERS
// =========================
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  statusEl.textContent = 'Kör...';
  if (!video) await boot();
  started = true;
  requestAnimationFrame(loop);
});

retryBtn.addEventListener('click', async () => {
  overlay.style.display = 'none';
  await boot();
});

adminLink.addEventListener('click', (e) => {
  e.preventDefault();
  const stats = getStats();
  alert('Greet stats (local):\n' + JSON.stringify(stats, null, 2));
});

// Auto-boot för snabb start
boot();

