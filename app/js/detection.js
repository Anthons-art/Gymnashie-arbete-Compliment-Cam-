// detection.js (TF + BlazeFace via global window.tf / blazeface)
let model = null;
let videoEl = null;

export async function initDetection(videoElement) {
  videoEl = videoElement;
  if (!model) {
    // blazeface ligger nu globalt på window.blazeface
    if (!window.tf || !window.blazeface) throw new Error('TFJS eller BlazeFace ej laddat');
    model = await window.blazeface.load();
    console.log('✅ BlazeFace model loaded');
  }
}

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

export function isReady() {
  return !!model;
}
