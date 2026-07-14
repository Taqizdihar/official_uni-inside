const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

text = text.replace(
  /  \/\/ Keep track of the continuous rawAngle to prevent 180-degree flip glitches during wrapping\n  const rawAngleValue = useTransform\(\(\) => {\n    const latestProgress = scrollYProgress.get\(\) as number;\n    const spacing = 10 \+ latestProgress \* 30;\n    const baseAngle = \(index - 4\) \* spacing;\n    return baseAngle \+ deckRotation.get\(\);\n  \}\);\n/g,
  ''
);

fs.writeFileSync('./src/App.tsx', text);
console.log("Removed rawAngleValue!");
