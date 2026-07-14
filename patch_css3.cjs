const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Adjust card container left offset for the wider card
text = text.replace(
  "left: '-120px',",
  "left: '-180px',"
);

// 2. Adjust active card scale and position
text = text.replace(
  'animate={isActive ? { scale: 1.15, y: "-22vh" } : { scale: 1, y: 0 }}',
  'animate={isActive ? { scale: 1.05, y: "-25vh" } : { scale: 1, y: 0 }}'
);

// 3. Adjust card base dimensions
text = text.replace(
  'className="relative w-[240px] h-[340px] cursor-pointer pointer-events-auto"',
  'className="relative w-[360px] h-[510px] cursor-pointer pointer-events-auto"'
);

// 4. Adjust the deck container margin if it isn't sufficient (keeping it at -mt-32 or pushing to -mt-40)
text = text.replace(
  'className="relative w-full max-w-5xl h-[600px] flex justify-center -mt-32 z-40 pointer-events-none"',
  'className="relative w-full max-w-5xl h-[600px] flex justify-center -mt-32 z-40 pointer-events-none"'
);

fs.writeFileSync('./src/App.tsx', text);
console.log("CSS patched round 3!");
