// app/js/main.js

import { initDetection, detectFacesAsync, isReady } from './detection.js';
import { initCompliments, randomCompliment } from './compliments.js';
import { clearCanvas, drawFrame, drawRobotIdle, drawRobotSpeak } from './ui.js';
import { initTTS, speak as ttsSpeak } from './tts.js';
import { cfg } from './config.js';



// DOM
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const retryBtn = document.getElementById('retry');
const adminLink = document.getElementById('adminLink');

// Video + state
let video = null;
let started = false;
let stableCounter = 0;
const STABLE_FRAMES = 5;
let state = 'idle';
let stateUntil = 0;

// Kontrollera om en detektion är relevant (ROI + minFaceSize + sannolikhet)
function detectionIsValid(det, canvasWidth, canvasHeight, config) {
  // det.topLeft = [x,y], det.bottomRight = [x,y], det.probability
  const [x1, y1] = det.topLeft;
  const [x2, y2] = det.bottomRight;
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  const cx = x1 + w/2;
  const cy = y1 + h/2;

  // ROI: mitt 70% område
  const roi = {
    xMin: canvasWidth * 0.15,
    xMax: canvasWidth * 0.85,
    yMin: canvasHeight * 0.15,
    yMax: canvasHeight * 0.85
  };
  const insideROI = cx >= roi.xMin && cx <= roi.xMax && cy >= roi.yMin && cy <= roi.yMax;

  // minFaceFrac: min bredd som andel av canvas (t.ex. 0.10 = 10%)
  const minFacePixels = canvasWidth * config.minFaceFrac;

  const bigEnough = w >= minFacePixels;
  const probOk = (det.probability ?? 0) >= config.minProbability;

  return insideROI && bigEnough && probOk;
}

// Detection worker state
let latestDetection = { count: 0, detections: [] };
let runningDetection = false;

// --- frame history / smoothing ---
const frameHistory = [];
const historyLen = cfg.detection.stableFrames || 12; // antal frames i historiken
const requiredHits = Math.ceil(historyLen * 0.75);   // 75% av frames måste vara giltiga

function pushFrame(validCount) {
  frameHistory.push(validCount > 0 ? 1 : 0);
  if (frameHistory.length > historyLen) frameHistory.shift();
}

function stableDetected() {
  if (frameHistory.length < historyLen) return false; // vänta tills full historik
  const sum = frameHistory.reduce((a,b)=>a+b,0);
  return sum >= requiredHits;
}



// greeting stats (localStorage)
function incGreetingCount() {
  const d = (new Date()).toISOString().slice(0,10);
  const raw = localStorage.getItem('greetStats') || '{}';
  const stats = JSON.parse(raw);
  stats[d] = (stats[d] || 0) + 1;
  localStorage.setItem('greetStats', JSON.stringify(stats));
}
function getStats() {
  return JSON.parse(localStorage.getItem('greetStats') || '{}');
}

// Camera init
async function initCamera(){
  video = document.createElement('video');
  video.setAttribute('playsinline','');
  video.autoplay = true;
  // lägre upplösning = bättre för budget-plattor
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false
  });
  video.srcObject = stream;
  await video.play();
}

// overlay helpers
function showOverlay(title, msg){
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMsg').textContent = msg;
  overlay.style.display = 'flex';
}
function hideOverlay(){ overlay.style.display = 'none'; }

// state helpers
function setState(s, ms=0) { state = s; stateUntil = performance.now() + ms; }
function inCooldown() { return performance.now() < stateUntil; }

// detection worker: kör detectFacesAsync i bakgrunden utan att blockera UI
async function detectionWorker() {
  // kör kontinuerligt med paus så vi inte spammar CPU
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
  // nästa körning efter ~80 ms (justera om plattan är svag)
  setTimeout(detectionWorker, 80);
}

// Trigger flow (vad som händer när vi bestämmer oss för att ge komplimang)
function triggerComplimentFlow(text) {
  // visa speak UI + spela TTS om möjligt
  drawRobotSpeak(ctx, canvas, text);
  incGreetingCount();
  const ok = ttsSpeak(text);
  // om ok === false => TTS ej tillgängligt, vi visar text ändå
  setState('cooldown', 3500);
}

// State uppdatering baserat på senaste detektion
function updateStateWithFace(faceCount) {
  if (faceCount > 0) stableCounter++; else stableCounter = 0;

  switch (state) {
    case 'idle':
      if (stableCounter >= STABLE_FRAMES) {
        setState('wave', 400);
      }
      break;
    case 'wave':
      if (performance.now() >= stateUntil) {
        const text = randomCompliment();
        triggerComplimentFlow(text);
      }
      break;
    case 'cooldown':
      if (performance.now() >= stateUntil) setState('idle', 0);
      break;
  }
}

// --- helper: räkna giltiga detectioner ---
function countValidDetections(detections, canvas) {
  if (!detections || !detections.length) return 0;
  let c = 0;
  for (const d of detections) {
    if (detectionIsValid(d, canvas.width, canvas.height, cfg.detection)) c++;
  }
  return c;
}

// huvudloop - ritar UI och läser senaste detection-resultat
function loop(t) {
  if (!started) return;
  clearCanvas(ctx, canvas);

// i loop(t) - läs senaste detection
const { detections } = latestDetection; // latestDetection uppdateras i detectionWorker
const validCount = countValidDetections(detections, canvas);

// fyll historiken
pushFrame(validCount);
if (!inCooldown() && stableDetected()) {
  setState('wave', cfg.timings.wave || 400);
  frameHistory.length = 0; // reset
}


// kontrollera cooldown och stabilitet
if (!inCooldown() && stableDetected()) {
  // trigga wave->speak via er state-machine
  if (state === 'idle') {
    setState('wave', cfg.timings.wave || 400);
  }
  // Töm history så ni inte direkt retriggar innan cooldown
  frameHistory.length = 0;
}



  // Läs senaste detection-resultat (uppdateras av detectionWorker)
  const { count } = latestDetection;

  updateStateWithFace(count);

  // Rita UI enligt state
  drawFrame(ctx, canvas);
  if (state === 'idle') drawRobotIdle(ctx, canvas, t);
  else if (state === 'wave') {
    // enkel wave: visa robot idle men vi kan lägga till animation senare
    drawRobotIdle(ctx, canvas, t);
  } else if (state === 'cooldown') {
    // Visas av triggerComplimentFlow när SPEAK inträffar
    // efter SPEAK är det cooldown; vi återgår till idle när tiden är slut
    drawRobotIdle(ctx, canvas, t);
  }

  requestAnimationFrame(loop);
}

// boot sequence
async function boot() {
  try {
    hideOverlay();
    statusEl.textContent = 'Initierar kamera...';
    await initCamera();
    statusEl.textContent = 'Initierar detektor...';
    await initDetection(video);
    // Starta detection worker i bakgrunden
    detectionWorker();
    statusEl.textContent = 'Initierar komplimanger...';
    await initCompliments();
    statusEl.textContent = 'Initierar röst (TTS)...';
    await initTTS().catch(()=>{/*ignore if not available*/});
    statusEl.textContent = 'Klar – tryck Starta';
    startBtn.disabled = false;
    console.log('Boot complete');
  } catch (e) {
    console.error('Boot failed', e);
    showOverlay('Fel vid uppstart', 'Kan inte starta kamera eller ladda modell. Kontrollera kamera-tillstånd och internet (för första laddning av modell).');
    startBtn.disabled = false;
  }
}

// Event handlers
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  statusEl.textContent = 'Kör...';
  if (!video) {
    // Om boot inte redan körts
    await boot();
  }
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

// auto-boot minimal så Start blir snabb (vi initierar så mycket vi kan i bakgrunden)
boot();
