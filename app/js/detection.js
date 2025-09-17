// app/js/detection.js
let faceDetector = null;
let videoEl = null;

export async function initDetection(videoElement) {
  videoEl = videoElement;
  // dynamic import from jsdelivr CDN
  const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest");
  const { FaceDetector, FilesetResolver } = vision;
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  // create detector with default model packaged in WASM
  faceDetector = await FaceDetector.createFromOptions(filesetResolver, {
    runningMode: "VIDEO",
    minDetectionConfidence: 0.55
  });
}

export function isReady() {
  return !!faceDetector;
}

// returns { count, detections }
export function detectFaces(ts) {
  if (!faceDetector || !videoEl) return { count: 0, detections: [] };
  try {
    const result = faceDetector.detectForVideo(videoEl, ts);
    const detections = result?.detections ?? [];
    return { count: detections.length, detections };
  } catch (e) {
    console.warn('detectFaces error', e);
    return { count: 0, detections: [] };
  }
}
