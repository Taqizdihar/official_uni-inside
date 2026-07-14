const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

const oldReturn = `  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: '-120px',
        top: '0px',
        transformOrigin: '50% 1000px',
        rotate: cardAngle,
        zIndex: isActive ? 50 : 20 + index
      }}
    >`;

const newReturn = `  const rawCardZIndex = useTransform(cardAngle, (angle) => Math.round(100 - Math.abs(angle as number)));
  const cardZIndex = useTransform(() => isActive ? 200 : rawCardZIndex.get());

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: '-120px',
        top: '0px',
        transformOrigin: '50% 1000px',
        rotate: cardAngle,
        zIndex: cardZIndex
      }}
    >`;

text = text.replace(oldReturn, newReturn);

fs.writeFileSync('./src/App.tsx', text);
console.log("Patched zIndex!");
