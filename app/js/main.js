// app/js/main.js
import { initDetection, detectFaces } from './detection.js';
import { initCompliments, randomCompliment } from './compliments.js';
import { clearCanvas, drawFrame, drawRobotIdle, drawRobotSpeak } from './ui.js';
import { initTTS, speak as ttsSpeak } from './tts.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const retryBtn = document.getElementById('retry');
const adminLink = document.getElementById('adminLink');

let video = null;
let started = false;
let stableCounter = 0;
const STABLE_FRAMES = 5;
let state = 'idle';
let stateUntil = 0;

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

// camera init
async function initCamera(){
  video = document.createElement('video');
  video.setAttribute('playsinline','');
  video.autoplay = true;
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

function triggerComplimentFlow(text){
  // show speak UI and TTS/fallback
  drawRobotSpeak(ctx, canvas, text);
  incGreetingCount();
  const ttsOk = ttsSpeak(text);
  // if TTS not available, just show text (fallback audio can be added)
  setState('cooldown', 3500);
}

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
      // just wait
      if (performance.now() >= stateUntil) setState('idle', 0);
      break;
  }
}

function loop(t) {
  if (!started) return;
  clearCanvas(ctx, canvas);
  // optionally draw camera background for mirror feel (commented out if perf is low)
  // ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const { count } = detectFaces(performance.now());
  updateStateWithFace(count);

  // draw UI based on state
  drawFrame(ctx, canvas);
  if (state === 'idle') drawRobotIdle(ctx, canvas, t);
  // wave state could have small animation - for POC we reuse idle
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
    statusEl.textContent = 'Initierar komplimanger...';
    await initCompliments();
    await initTTS(); // best-effort
    statusEl.textContent = 'Klar – tryck Starta';
    startBtn.disabled = false;
  } catch (e) {
    console.error('Boot failed', e);
    showOverlay('Fel vid uppstart', 'Kan inte starta kamera eller laddning av modeller. Kontrollera kamera-tillstånd och internet (för första laddning).');
    startBtn.disabled = false;
  }
}

// event handlers
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  statusEl.textContent = 'Kör...';
  if (!video) {
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

// auto-boot minimal (so Start will be quick)
boot();
