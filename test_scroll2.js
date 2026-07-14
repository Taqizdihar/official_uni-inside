const wrap = (min, max, v) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const deckRotation = -100;
const index = 0; // base is -4 * spacing

for (let p = 0; p <= 1; p += 0.1) {
  const spacing = 10 + p * 30;
  const totalSpan = 9 * spacing;
  const halfSpan = totalSpan / 2;
  const baseAngle = (index - 4) * spacing;
  const rawAngle = baseAngle + deckRotation;
  
  const wrapped = wrap(-halfSpan, halfSpan, rawAngle);
  console.log(`p=${p.toFixed(1)}, spacing=${spacing.toFixed(1)}, raw=${rawAngle.toFixed(1)}, min=${-halfSpan.toFixed(1)}, max=${halfSpan.toFixed(1)}, wrapped=${wrapped.toFixed(1)}`);
}
