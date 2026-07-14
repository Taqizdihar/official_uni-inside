const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

// Update CardItem
const newCardItemAngle = `  const cardAngle = useTransform(() => {
    const latestProgress = scrollYProgress.get() as number;
    const spacing = 10 + latestProgress * 30;
    const totalSpan = 9 * spacing;
    const halfSpan = totalSpan / 2;
    const baseAngle = (index - 4) * spacing;
    const rawAngle = baseAngle + deckRotation.get();
    
    const min = -halfSpan;
    const max = halfSpan;
    const rangeSize = max - min;
    return ((((rawAngle - min) % rangeSize) + rangeSize) % rangeSize) + min;
  });

  const highlightProgress = useSpring(isActive ? 1 : 0, { stiffness: 60, damping: 15 });
  
  const inverseRotation = useTransform(() => {
    const globalAngle = cardAngle.get() as number;
    return -globalAngle * highlightProgress.get();
  });`;

text = text.replace(
  /  const cardAngle = useTransform[\s\S]*?return -globalAngle \* highlightProgress\.get\(\);\n  \}\);/g,
  newCardItemAngle
);

// Update OurTeamSection
const oldDeckContainer = `      {/* Deck Container */}
      <div className="relative w-full max-w-5xl h-[600px] flex justify-center mt-10 z-40 pointer-events-none">
        <motion.div 
          className="relative w-0 h-0 pointer-events-none"
          style={{ 
            rotate: deckRotation,
            transformOrigin: '50% 1000px' 
          }}
        >`;

const newDeckContainer = `      {/* Deck Container */}
      <div className="relative w-full max-w-5xl h-[600px] flex justify-center mt-10 z-40 pointer-events-none">
        <motion.div 
          className="relative w-0 h-0 pointer-events-none"
          style={{ 
            transformOrigin: '50% 1000px' 
          }}
        >`;

text = text.replace(oldDeckContainer, newDeckContainer);

fs.writeFileSync('./src/App.tsx', text);
console.log("Patched!");
