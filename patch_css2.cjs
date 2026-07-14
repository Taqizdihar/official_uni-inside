const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Close the Gap further
text = text.replace(
  'className="relative w-full max-w-5xl h-[600px] flex justify-center -mt-16 z-40 pointer-events-none"',
  'className="relative w-full max-w-5xl h-[600px] flex justify-center -mt-32 z-40 pointer-events-none"'
);

// 2. Fix highlighted card clipping / size
text = text.replace(
  'animate={isActive ? { scale: 1.25, y: "-12vh" } : { scale: 1, y: 0 }}',
  'animate={isActive ? { scale: 1.15, y: "-22vh" } : { scale: 1, y: 0 }}'
);

fs.writeFileSync('./src/App.tsx', text);
console.log("CSS patched round 2!");
