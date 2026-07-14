const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

const oldInverse = `  const inverseRotation = useTransform(() => {
    const globalAngle = cardAngle.get() as number;
    return -globalAngle * highlightProgress.get();
  });`;

const newInverse = `  // Keep track of the continuous rawAngle to prevent 180-degree flip glitches during wrapping
  const rawAngleValue = useTransform(() => {
    const latestProgress = scrollYProgress.get() as number;
    const spacing = 10 + latestProgress * 30;
    const baseAngle = (index - 4) * spacing;
    return baseAngle + deckRotation.get();
  });

  const inverseRotation = useTransform(() => {
    const wrapped = cardAngle.get() as number;
    const raw = rawAngleValue.get() as number;
    const highlight = highlightProgress.get();
    
    // Total desired absolute rotation: raw * (1 - highlight)
    // To achieve this total when parent is rotated by 'wrapped':
    // childRotation = total - parent = raw * (1 - highlight) - wrapped
    return raw * (1 - highlight) - wrapped;
  });`;

text = text.replace(oldInverse, newInverse);

fs.writeFileSync('./src/App.tsx', text);
console.log("Patched inverseRotation!");
