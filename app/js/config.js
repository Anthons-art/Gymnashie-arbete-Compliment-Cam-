export const cfg = {
  detection: {
    minProbability: 0.65,
    minFaceFrac: 0.07,
    useROI: true,
    stableFrames: 15
  },
  timings: {
    wave: 400,
    speak: 1600,
    cooldown: 3500
  },
  detectionIntervalMs: 80
};
