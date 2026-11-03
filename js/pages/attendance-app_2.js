function getEyeAspectRatio(eyeLandmarks) {
  const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  const v1 = dist(eyeLandmarks[1], eyeLandmarks[5]);
  const v2 = dist(eyeLandmarks[2], eyeLandmarks[4]);
  const h = dist(eyeLandmarks[0], eyeLandmarks[3]);
  return (v1 + v2) / (2.0 * h);
}

// Fungsi Helper untuk mendeteksi mulut terbuka
function getMouthAspectRatio(jawLandmarks, mouthLandmarks) {
  const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  const v = dist(mouthLandmarks[13], mouthLandmarks[19]);
  const h = dist(mouthLandmarks[0], mouthLandmarks[6]);
  return v / h;
}