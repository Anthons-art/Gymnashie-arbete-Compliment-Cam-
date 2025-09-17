// app/js/main.js
import { initDetection, detectFacesAsync, isReady } from './detection.js';
import { initCompliments, randomCompliment } from './compliments.js';
import { clearCanvas, drawFrame, drawRobotIdle, drawRobotSpeak } from './ui.js';
import { initTTS, speak as ttsSpeak } from './tts.js';

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

// Detection worker state
let latestDetection = { count: 0, detections: [] };
let runningDetection = false;

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

// huvudloop - ritar UI och läser senaste detection-resultat
function loop(t) {
  if (!started) return;
  clearCanvas(ctx, canvas);

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

