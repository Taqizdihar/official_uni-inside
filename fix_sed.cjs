const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

text = text.replace(
  'animate={isActive ? { scale: 1.5,\n                  backgroundColor, y: -40 } : { scale: 1, y: 0 }}',
  'animate={isActive ? { scale: 1.5, y: -40 } : { scale: 1, y: 0 }}'
);

fs.writeFileSync('./src/App.tsx', text);
console.log("fixed scale issue");
