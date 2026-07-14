const wrap = (min, max, v) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const deckRotation = -100;
const index = 0; 

for (let p = 0; p <= 1; p += 0.1) {
  const spacing = 10 + p * 30;
  
  const deckIndexOffset = deckRotation / spacing;
  
  const rawIndex = index - 4 + deckIndexOffset;
  const wrappedIndex = wrap(-4.5, 4.5, rawIndex);
  const cardAngle = wrappedIndex * spacing;
  
  console.log(`p=${p.toFixed(1)}, spacing=${spacing.toFixed(1)}, wrappedIdx=${wrappedIndex.toFixed(1)}, angle=${cardAngle.toFixed(1)}`);
}
