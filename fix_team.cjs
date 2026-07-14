const fs = require('fs');
const file = './src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix imports
content = content.replace(
  "import { motion, useMotionValue, useMotionTemplate, AnimatePresence, useAnimation, useInView, useScroll, useTransform, useMotionValueEvent } from 'motion/react';",
  "import { motion, useMotionValue, useMotionTemplate, AnimatePresence, useAnimation, useInView, useScroll, useTransform, useMotionValueEvent, useSpring, animate } from 'motion/react';"
);

// 2. Fix teamProgress
content = content.replace(
  'const { scrollYProgress: teamProgress } = useScroll({\n    target: teamRef,\n    offset: ["start end", "start start"]\n  });',
  'const { scrollYProgress: teamProgress } = useScroll({\n    target: teamRef,\n    offset: ["start 50%", "start start"]\n  });'
);

// 3. Replace OurTeamSection
const startIndex = content.indexOf('const OurTeamSection = forwardRef<HTMLDivElement, {}>((props, ref) => {');
const endString = "OurTeamSection.displayName = 'OurTeamSection';";
const endIndex = content.indexOf(endString, startIndex) + endString.length;

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find OurTeamSection bounds.");
  process.exit(1);
}

const replacement = `const CardItem = ({ 
  index, 
  activeCard, 
  handleCardClick, 
  isFlipped, 
  scrollYProgress, 
  deckRotation 
}: {
  index: number;
  activeCard: number | null;
  handleCardClick: (i: number) => void;
  isFlipped: boolean;
  scrollYProgress: any;
  deckRotation: any;
}) => {
  const isActive = activeCard === index;
  
  const cardAngle = useTransform(scrollYProgress, (latest) => (index - 4) * (10 + latest * 30));
  const highlightProgress = useSpring(isActive ? 1 : 0, { stiffness: 60, damping: 15 });
  
  const inverseRotation = useTransform(() => {
    const globalAngle = deckRotation.get() + cardAngle.get();
    return -globalAngle * highlightProgress.get();
  });

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: '-120px',
        top: '0px',
        transformOrigin: '50% 1000px',
        rotate: cardAngle,
        zIndex: isActive ? 50 : 20 + index
      }}
    >
      <motion.div
        animate={isActive ? { scale: 1.5, y: -40 } : { scale: 1, y: 0 }}
        transition={{ scale: { duration: 0.6, ease: "backOut" }, y: { duration: 0.6, ease: "backOut" } }}
        className="relative w-[240px] h-[340px] cursor-pointer pointer-events-auto"
        style={{ perspective: 1200, rotate: inverseRotation }}
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick(index);
        }}
      >
        <motion.div
          animate={isActive ? { y: [-10, 10, -10] } : { y: 0 }}
          transition={isActive ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : {}}
          className="w-full h-full"
        >
          <motion.div
            className="w-full h-full relative"
            animate={{ rotateY: isActive && isFlipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div 
              className="absolute inset-0 bg-[#f0f0f0] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[6px] border-white flex flex-col items-center justify-center overflow-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#202121]/5 to-transparent pointer-events-none" />
              <User className="w-24 h-24 text-[#202121]/80 mb-4" strokeWidth={1.5} />
              <div className="absolute bottom-4 left-4 right-4 h-12 bg-[#202121]/5 rounded-xl flex items-center justify-center font-bold text-[#202121] uppercase tracking-widest text-sm border border-[#202121]/10">
                Member {index + 1}
              </div>
            </div>
            
            {/* Back */}
            <div 
              className="absolute inset-0 bg-[#202121] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[6px] border-[#f9d02d] flex flex-col items-center p-6 text-center overflow-hidden"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
            >
              <h3 className="text-white font-black text-2xl mb-1 uppercase tracking-wider mt-4">Name {index + 1}</h3>
              <p className="text-[#f9d02d] font-bold text-[10px] uppercase tracking-[0.2em] mb-6">Creative Director</p>
              <p className="text-white/80 text-sm leading-relaxed mb-auto font-medium">
                Passionate about blending bold design with interactive technology to create stunning visual experiences.
              </p>
              <div className="flex gap-5 text-white/50 mb-4">
                <Twitter className="w-5 h-5 hover:text-[#f9d02d] hover:scale-110 transition-all cursor-pointer" />
                <Linkedin className="w-5 h-5 hover:text-[#f9d02d] hover:scale-110 transition-all cursor-pointer" />
                <Instagram className="w-5 h-5 hover:text-[#f9d02d] hover:scale-110 transition-all cursor-pointer" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const OurTeamSection = forwardRef<HTMLDivElement, {}>((props, ref) => {
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
  });

  const handleCardClick = (index: number) => {
    if (activeCard === index) {
      setIsFlipped(!isFlipped);
    } else {
      setActiveCard(index);
      setIsFlipped(false);
    }
  };

  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div ref={setRefs} className="w-full min-h-[300vh] relative z-10 flex flex-col items-center pt-32 overflow-hidden pb-40">
      {/* Heading */}
      <div className="flex flex-col items-center relative z-10 pointer-events-none mb-20 px-8 text-center">
        <h2 className="text-[60px] sm:text-[80px] lg:text-[110px] font-black leading-none uppercase text-white tracking-tight drop-shadow-2xl">
          MEET OUR TEAM
        </h2>
        <motion.p 
          animate={subtextControls}
          className="text-xl sm:text-2xl text-white/80 font-medium tracking-wide mt-4"
        >
          Click for preview, click again for details!
        </motion.p>
      </div>

      {/* Deck Container */}
      <div className="relative w-full max-w-5xl h-[600px] flex justify-center mt-10 z-40 pointer-events-none">
        <motion.div 
          className="relative w-0 h-0 pointer-events-none"
          style={{ 
            rotate: deckRotation,
            transformOrigin: '50% 1000px' 
          }}
        >
          {indices.map((index) => (
            <CardItem 
              key={index} 
              index={index} 
              activeCard={activeCard} 
              handleCardClick={handleCardClick} 
              isFlipped={isFlipped}
              scrollYProgress={scrollYProgress}
              deckRotation={deckRotation}
            />
          ))}
        </motion.div>
      </div>

      {/* Overlay to deselect */}
      {activeCard !== null && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => { setActiveCard(null); setIsFlipped(false); }}
        />
      )}
    </div>
  );
};
OurTeamSection.displayName = 'OurTeamSection';`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(file, content);
console.log("Successfully replaced OurTeamSection and fixed issues.");
