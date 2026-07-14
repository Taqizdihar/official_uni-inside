const fs = require('fs');
let text = fs.readFileSync('./src/App.tsx', 'utf8');

const oldOurTeamSection = `const OurTeamSection = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const setRefs = (node: HTMLDivElement) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as any).current = node;
    containerRef.current = node;
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const subtextControls = useAnimation();

  const targetDeckRotation = useMotionValue(0);
  const deckRotation = useSpring(targetDeckRotation, { stiffness: 60, damping: 15 });
  const rotationOffset = useRef(0);
  
  useEffect(() => {
    let animation;
    if (activeCard === null) {
      animation = animate(targetDeckRotation, targetDeckRotation.get() - 360, {
        duration: 30,
        ease: "linear",
        repeat: Infinity
      });
      subtextControls.start({ opacity: 1 });
    } else {
      const latestProgress = scrollYProgress.get();
      const cardAngle = (activeCard - 4) * (10 + latestProgress * 30);
      const desiredTarget = -cardAngle + latestProgress * 180;
      
      const currentTarget = targetDeckRotation.get();
      const diff = (desiredTarget - currentTarget) % 360;
      const shortestDiff = diff > 180 ? diff - 360 : diff < -180 ? diff + 360 : diff;
      rotationOffset.current = currentTarget + shortestDiff - desiredTarget;
      
      targetDeckRotation.set(desiredTarget + rotationOffset.current);
      subtextControls.start({ opacity: 0 });
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [activeCard, subtextControls]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (activeCard !== null) {
      const cardAngle = (activeCard - 4) * (10 + latest * 30);
      const desiredTarget = -cardAngle + latest * 180;
      targetDeckRotation.set(desiredTarget + rotationOffset.current);
    }
  });`;

const newOurTeamSection = `const OurTeamSection = forwardRef<HTMLDivElement, {}>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const setRefs = (node: HTMLDivElement) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as any).current = node;
    containerRef.current = node;
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const subtextControls = useAnimation();

  const baseAngle = useMotionValue(0);
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
  });`;

text = text.replace(oldOurTeamSection, newOurTeamSection);
fs.writeFileSync('./src/App.tsx', text);
console.log("Patched OurTeamSection!");
