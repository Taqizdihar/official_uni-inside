const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

const regex = /  const inverseRotation = useTransform\(\(\) => {[\s\S]*?return raw \* \(1 - highlight\) - wrapped;\n  \}\);/g;

const replacement = `  const inverseRotation = useTransform(() => {
    const wrapped = cardAngle.get() as number;
    const highlight = highlightProgress.get();
    return -wrapped * highlight;
  });`;

if (regex.test(text)) {
  text = text.replace(regex, replacement);
  fs.writeFileSync('./src/App.tsx', text);
  console.log("Patched inverseRotation back to simple!");
} else {
  console.log("Regex didn't match.");
}
