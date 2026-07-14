const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

text = text.replace(
  'deckRotation={deckRotation}',
  'deckRotation={baseAngle}'
);

fs.writeFileSync('./src/App.tsx', text);
console.log("Patched loop!");
