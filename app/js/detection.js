/* detection.js  ----------------
   Face detection via TensorFlow.js + BlazeFace (global window.tf / window.blazeface)
*/

// -------------------------
// STATE
// -------------------------
let model = null;
let videoEl = null;

// -------------------------
// INIT
// -------------------------
export async function initDetection(videoElement) {
  videoEl = videoElement;
  if (!model) {
    if (!window.tf || !window.blazeface) throw new Error('TFJS eller BlazeFace ej laddat');
    model = await window.blazeface.load();
    console.log('✅ BlazeFace model loaded');
  }
}

// -------------------------
// DETECTION
// -------------------------
export async function detectFacesAsync() {
  if (!model || !videoEl) return { count: 0, detections: [] };
  try {
    const preds = await model.estimateFaces(videoEl, false);
    const detections = preds.map(p => ({
      topLeft: p.topLeft,
      bottomRight: p.bottomRight,
      probability: Array.isArray(p.probability) ? p.probability[0] : p.probability
    }));
    return { count: detections.length, detections };
  } catch (e) {
    console.warn('detectFacesAsync error', e);
    return { count: 0, detections: [] };
  }
}

// -------------------------
// STATUS
// -------------------------
export function isReady() {
  return !!model;
}
