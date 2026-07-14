const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

const regex = /const targetDeckRotation = useMotionValue\(0\);[\s\S]*?targetDeckRotation\.set\(desiredTarget \+ rotationOffset\.current\);\n    \}\n  \}\);\n/g;

const replacement = `const baseAngle = useMotionValue(0);
  const rotationOffset = useRef(0);

  useAnimationFrame((t, delta) => {
    if (activeCard === null) {
      baseAngle.set(baseAngle.get() - (0.012 * delta));
    }
  });
  
  useEffect(() => {
    if (activeCard === null) {
      subtextControls.start({ opacity: 1 });
    } else {
      const latestProgress = scrollYProgress.get();
      const cardAngle = (activeCard - 4) * (10 + latestProgress * 30);
      const desiredTarget = -cardAngle + latestProgress * 180;
      
      const currentTarget = baseAngle.get();
      const diff = (desiredTarget - currentTarget) % 360;
      const shortestDiff = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
      rotationOffset.current = currentTarget + shortestDiff - desiredTarget;
      
      animate(baseAngle, desiredTarget + rotationOffset.current, { duration: 0.8, ease: "easeInOut" });
      subtextControls.start({ opacity: 0 });
    }
  }, [activeCard, subtextControls, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (activeCard !== null) {
      const cardAngle = (activeCard - 4) * (10 + latest * 30);
      const desiredTarget = -cardAngle + latest * 180;
      baseAngle.set(desiredTarget + rotationOffset.current);
    }
  });\n`;

if (regex.test(text)) {
  text = text.replace(regex, replacement);
  fs.writeFileSync('./src/App.tsx', text);
  console.log("Patched!");
} else {
  console.log("Regex didn't match.");
}
