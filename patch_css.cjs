const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Close the Gap
text = text.replace(
  'className="relative w-full max-w-5xl h-[600px] flex justify-center mt-10 z-40 pointer-events-none"',
  'className="relative w-full max-w-5xl h-[600px] flex justify-center -mt-16 z-40 pointer-events-none"'
);

// 2. Fix highlighted card clipping
text = text.replace(
  'animate={isActive ? { scale: 1.5, y: -40 } : { scale: 1, y: 0 }}',
  'animate={isActive ? { scale: 1.25, y: "-12vh" } : { scale: 1, y: 0 }}'
);

// 3. Reduce diameter
text = text.replace(
  `        <motion.div \n          className="relative w-0 h-0 pointer-events-none"\n          style={{ \n            transformOrigin: '50% 1000px' \n          }}\n        >`,
  `        <motion.div \n          className="relative w-0 h-0 pointer-events-none"\n          style={{ \n            transformOrigin: '50% 1000px',\n            transform: 'scale(0.85)'\n          }}\n        >`
);

fs.writeFileSync('./src/App.tsx', text);
console.log("CSS patched!");
