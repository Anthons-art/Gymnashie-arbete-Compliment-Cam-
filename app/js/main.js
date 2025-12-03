// =========================
// IMPORTS
// =========================
import { initDetection, detectFacesAsync, isReady } from './detection.js';
import { initCompliments, randomComplimentByTime, randomCompliment, randomGroupCompliment, setComplimentMode } from './compliments.js';
import { initUI, clearCanvas, drawRobotIdle, drawRobotSpeak, drawRobotWave, drawRobotFun, loadTwoFrameAnimation, drawTwoFrameAnimation} from './ui.js';
import { initAudio, playAudioByName } from './audio.js';
import { cfg } from './config.js';
import { loadRobotImages, loadFunImages, drawRobotImage, loadBlinkImage, drawRobotBlink } from './ui.js';

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

let state = "idle"; // idle | talking | touchwave | touchfun
let stateUntil = 0;

let stableCounter = 0;
let currentCompliment = "";

let latestDetection = { count: 0, detections: [] };
let runningDetection = false;

// TWO-FRAME ANIMATION
let twoAnimStart = 0;
let twoAnimIndex = 0;
let twoAnimLoop = 0;

const TWO_ANIM_FRAMES = 2;         // antal frames (du har 2)
const TWO_ANIM_LOOP_COUNT = 4;     // hur många varv
const TWO_ANIM_FRAME_DURATION = 250; // hur länge varje frame visas (ms)



const frameHistory = [];
const requiredHits = 10;

let silenceMode = false;
let silenceStart = 0;
const SILENCE_TIME = 9000;

// ========== Wave animation ==========
let waveAnimationStart = 0;
let waveAnimationIndex = 0;
const WAVE_FRAME_DURATION = 150;
const WAVE_TOTAL_FRAMES = 3;
const EXTRA_LAST_FRAME_TIME = 750; // Förlänger sista bilden

// BLINK (1-frame animation)
let isBlinking = false;
let blinkEndTime = 0;
let nextBlinkTime = performance.now() + 3000 + Math.random() * 400; // 3–7 sek
const BLINK_DURATION = 120; // ms



// ========== FUN animation (7 frames) ==========
let funAnimationStart = 0;
let funAnimationIndex = 0;
const FUN_TOTAL_FRAMES = 7;
const FUN_FRAME_DURATION = 130;
const FUN_EXTRA_LAST_FRAME = 750;
let animationCooldown = false;
const ANIMATION_COOLDOWN_TIME = 2500; // ms — hur länge man inte får klicka

// =========================
// HELPERS
// =========================
function setState(s, ms = 0) {
  state = s;
  stateUntil = performance.now() + ms;
}

function stateExpired() {
  return performance.now() >= stateUntil;
}

function inSilenceMode() {
  return silenceMode && performance.now() - silenceStart < SILENCE_TIME;
}

// =========================
// CAMERA INIT
// =========================
async function initCamera() {
  video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.autoplay = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    audio: false
  });

  video.srcObject = stream;
  await video.play();
}

// =========================
// DETECTION LOGIC
// =========================
function detectionIsValid(det, canvasWidth, canvasHeight) {
  const [x1, y1] = det.topLeft;
  const [x2, y2] = det.bottomRight;
  const w = x2 - x1;
  const h = y2 - y1;

  const minW = canvasWidth * cfg.detection.minFaceFrac;
  if (w < minW) return false;
  if (det.probability < cfg.detection.minProbability) return false;
  return true;
}

function countValidDetections(d) {
  if (!d || !d.length) return 0;
  return d.filter(det => detectionIsValid(det, canvas.width, canvas.height)).length;
}

function pushFrame(hit) {
  frameHistory.push(hit ? 1 : 0);
  if (frameHistory.length > 15) frameHistory.shift();
}

function stableDetected() {
  return frameHistory.reduce((a, b) => a + b, 0) >= requiredHits;
}

async function detectionWorker() {
  if (!runningDetection && isReady()) {
    runningDetection = true;
    try {
      latestDetection = await detectFacesAsync();
    } catch (err) {
      console.warn("Detection error", err);
    }
    runningDetection = false;
  }
  setTimeout(detectionWorker, cfg.detectionIntervalMs);
}
// =========================
// COMPLIMENT FLOW
// =========================
function triggerCompliment(compliment) {
  if (!compliment) return;
  if (state !== "idle") return;

  currentCompliment = compliment.text;
  setState("talking");

  // Spela ljud direkt från JSON
  if (compliment.audio) {
    const audio = new Audio(`./assets/sfx/${compliment.audio}`);
    audio.play().catch(err => console.warn("Audio playback failed", err));
    audio.onended = () => {
      setState("idle");
      silenceMode = true;
      silenceStart = performance.now();
    };
  } else {
    // fallback om ingen audio
    playAudioByName(compliment.text, () => {
      setState("idle");
      silenceMode = true;
      silenceStart = performance.now();
    });
  }
}



function triggerBlink() {
  if (state !== "idle") return; // blink bara om idle
  isBlinking = true;
  blinkEndTime = performance.now() + BLINK_DURATION;

  // sätt nästa blink
  nextBlinkTime = performance.now() + 3000 + Math.random() * 4000;
}


// =========================
// UPDATE STATE WITH FACE
// =========================
function updateStateWithFace(faceCount) {
  if (faceCount > 0) stableCounter++;
  else stableCounter = 0;

  if (inSilenceMode()) return;
  if (state !== "idle") return;

  if (stableDetected()) {
    const text =
      faceCount > 1 ? randomGroupCompliment()
      : stableCounter > 600 ? randomCompliment("studie")
      : randomComplimentByTime();

    triggerCompliment(text);
    frameHistory.length = 0;
  }
}

// =========================
// TOUCH ANIMATIONS
// =========================
function triggerTouchWave() {
  if (state !== "idle") return;
  state = "touchwave";
  waveAnimationStart = performance.now();
  waveAnimationIndex = 0;
}

function triggerTwoFrameAnimation() {
  if (state !== "idle") return;

  state = "twoAnim";
  twoAnimStart = performance.now();
  twoAnimIndex = 0;
  twoAnimLoop = 0;
}


function triggerTouchFun() {
  if (state !== "idle") return;
  state = "touchfun";
  funAnimationStart = performance.now();
  funAnimationIndex = 0;
}

function startAnimationCooldown() {
  animationCooldown = true;
  setTimeout(() => {
    animationCooldown = false;
  }, ANIMATION_COOLDOWN_TIME);
}


// =========================
// MAIN LOOP
// =========================
function loop() {
  if (!started) return;

  clearCanvas(ctx, canvas);
  drawRobotImage(ctx, canvas);

  // TALKING
  if (state === "talking") {
    drawRobotSpeak(ctx, canvas, currentCompliment);

  // WAVE ANIMATION
  } else if (state === "touchwave") {
    const elapsed = performance.now() - waveAnimationStart;
    const baseDuration = WAVE_TOTAL_FRAMES * WAVE_FRAME_DURATION;

    if (elapsed < baseDuration) {
      waveAnimationIndex = Math.floor(elapsed / WAVE_FRAME_DURATION);
      drawRobotWave(ctx, canvas, waveAnimationIndex);
    } else if (elapsed < baseDuration + EXTRA_LAST_FRAME_TIME) {
      drawRobotWave(ctx, canvas, WAVE_TOTAL_FRAMES - 1);
    } else {
      state = "idle";
      startAnimationCooldown();
    }

// TWO-FRAME ANIMATION (loopar flera varv)
} else if (state === "twoAnim") {

  const elapsed = performance.now() - twoAnimStart;

  // Hur många ms varje varv är
  const loopDuration = TWO_ANIM_FRAMES * TWO_ANIM_FRAME_DURATION;

  // Vilket varv är vi i?
  twoAnimLoop = Math.floor(elapsed / loopDuration);

  if (twoAnimLoop < TWO_ANIM_LOOP_COUNT) {

    // Hur långt in i varvet är vi?
    const loopElapsed = elapsed % loopDuration;

    // Bestäm frame (0 eller 1)
    twoAnimIndex = Math.floor(loopElapsed / TWO_ANIM_FRAME_DURATION);

    // Rita frame
    drawTwoFrameAnimation(ctx, canvas, twoAnimIndex);

  } else {
    // Alla loops färdiga
    state = "idle";
    startAnimationCooldown();
  }



   // FUN ANIMATION
  } else if (state === "touchfun") {
    const elapsed = performance.now() - funAnimationStart;
    const baseDuration = FUN_TOTAL_FRAMES * FUN_FRAME_DURATION;

    if (elapsed < baseDuration) {
      funAnimationIndex = Math.floor(elapsed / FUN_FRAME_DURATION);
      drawRobotFun(ctx, canvas, funAnimationIndex);
    } else if (elapsed < baseDuration + FUN_EXTRA_LAST_FRAME) {
      drawRobotFun(ctx, canvas, FUN_TOTAL_FRAMES - 1);
    } else {
      state = "idle";
    }
    

  // IDLE
  } else {
  // IDLE — men kolla om blink pågår
  if (isBlinking) {
    drawRobotBlink(ctx, canvas);
    
    // avsluta blink om tiden gått
    if (performance.now() >= blinkEndTime) {
      isBlinking = false;
    }
  } else {
    drawRobotIdle(ctx, canvas);

    // trigga blink om det är dags
    if (performance.now() >= nextBlinkTime) {
      triggerBlink();
    }
  }
}


  const valid = countValidDetections(latestDetection.detections);
  pushFrame(valid > 0);
  updateStateWithFace(valid);

  requestAnimationFrame(loop);
}

// =========================
// BOOT
// =========================
async function boot() {
  try {
    overlay.style.display = 'none';
    statusEl.textContent = "Initierar kamera...";
    await initCamera();

    statusEl.textContent = "Laddar modell...";
    await initDetection(video);
    detectionWorker();

    statusEl.textContent = "Laddar komplimanger...";
    setComplimentMode(true);
    await initCompliments();

    statusEl.textContent = "Laddar robotbilder...";
    await loadRobotImages();
    await loadFunImages();
    await loadBlinkImage();
    await loadTwoFrameAnimation();



    statusEl.textContent = "Laddar ljudfiler...";
    await initAudio();

    statusEl.textContent = "Startklar ✔️";
  } catch (err) {
    console.error(err);
    overlay.style.display = 'flex';
  }
}

// =========================
// EVENTS
// =========================
document.getElementById("twoBtn").addEventListener("click", (e) => {
  e.stopPropagation();    // STOPPAR pointerdown från att triggas
  triggerTwoFrameAnimation();
});


// Slumpa animation vid klick (men INTE om man trycker på knappen!)
document.addEventListener("pointerdown", (e) => {
  if (animationCooldown) return;

  // Om knappen trycktes → avbryt
  if (e.target.id === "twoBtn") return;

  if (Math.random() < 0.5) triggerTouchWave();
  else triggerTouchFun();
});


retryBtn.addEventListener("click", boot);
adminLink.addEventListener("click", () => {
  alert("Stats: " + JSON.stringify(localStorage.getItem("greetStats")));
});

boot().then(() => {
  // starta automatiskt när allt är laddat
  started = true;
  requestAnimationFrame(loop);
});

