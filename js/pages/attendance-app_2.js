// ==========================================
// FILE 1: js/pages/attendance-app_2.js (HELPER LIVENESS EAR & MAR)
// ==========================================
function getEyeAspectRatio(eyeLandmarks) {
  if (!eyeLandmarks || eyeLandmarks.length < 6) return 0.3;
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const v1 = dist(eyeLandmarks[1], eyeLandmarks[5]);
  const v2 = dist(eyeLandmarks[2], eyeLandmarks[4]);
  const h = dist(eyeLandmarks[0], eyeLandmarks[3]);
  return (v1 + v2) / (2.0 * h);
}

function getMouthAspectRatio(jawLandmarks, mouthLandmarks) {
  if (!mouthLandmarks || mouthLandmarks.length < 20) return 0;
  const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const v = dist(mouthLandmarks[13], mouthLandmarks[19]);
  const h = dist(mouthLandmarks[0], mouthLandmarks[6]);
  return v / h;
}