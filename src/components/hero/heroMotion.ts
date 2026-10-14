/** Cumulative rotation keeps a propeller's direction through every activation cycle. */
export function advanceRotorAngle(angle: number, deltaSeconds: number, activity: number, speed = 14) {
  return angle + Math.max(0, Math.min(deltaSeconds, 0.05)) * Math.max(0, activity) * speed;
}

export function smoothStep(value: number) {
  const progress = Math.min(1, Math.max(0, value));
  return progress * progress * (3 - 2 * progress);
}
