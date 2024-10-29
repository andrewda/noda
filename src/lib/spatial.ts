export const polarDegToXyz = (yawDeg: number, pitchDeg: number, distance: number) => {
  const yawRad = yawDeg * Math.PI / 180;
  const pitchRad = pitchDeg * Math.PI / 180;

  const positionX = distance * Math.sin(yawRad) * Math.cos(pitchRad);
  const positionY = distance * Math.cos(yawRad) * Math.cos(pitchRad);
  const positionZ = distance * Math.sin(pitchRad);

  const orientationX = -positionX;
  const orientationY = -positionY;
  const orientationZ = -positionZ;

  return { positionX, positionY, positionZ, orientationX, orientationY, orientationZ };
};
