const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

text = text.replace(
  'animate={isActive ? { scale: 1.05, y: "-25vh" } : { scale: 1, y: 0 }}',
  'animate={isActive ? { scale: 1.1, y: -250 } : { scale: 1, y: 0 }}'
);

fs.writeFileSync('./src/App.tsx', text);
console.log("CSS patched round 4!");
