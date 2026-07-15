import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { motion, useMotionValue, useMotionTemplate, AnimatePresence, useAnimation, useInView, useScroll, useTransform, useMotionValueEvent, useSpring, useAnimationFrame, animate } from 'motion/react';
import { ChevronRight, Sparkles, Camera, Video, Monitor, Image as ImageIcon, Scissors, Aperture, Smartphone, PenTool, Lightbulb, User, Twitter, Linkedin, Instagram } from 'lucide-react';
import { AchievementsSection } from './components/AchievementsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ScrollStory, ScrollStoryHandle } from './components/ScrollStory';
import { HeroModel } from './components/HeroModel';
import { HeroAnimatedHeading } from './components/HeroAnimatedHeading';
import { type AppSectionId } from './components/ThemeController';

import member1 from './assets/our-team/members/1 - April.jpg';
import member2 from './assets/our-team/members/2 - Dian.jpg';
import member3 from './assets/our-team/members/3 - Taqi.jpg';
import member4 from './assets/our-team/members/4 - Amadea.jpg';
import member5 from './assets/our-team/members/5 - Nadine.jpg';
import member6 from './assets/our-team/members/6 - Naura.jpg';
import member7 from './assets/our-team/members/7 - Anggi.jpg';
import member8 from './assets/our-team/members/8 - Amany.jpg';
import member9 from './assets/our-team/members/9 - Ropaldo.jpg';
import logoDarkTheme from './assets/global/Logo - Dark Theme.png';
import logoLightTheme from './assets/global/Logo - Light Theme.png';
import craftsLogo from './assets/global/Uni-Inside Crafts.png';

import partner1 from './assets/about-us/partners/GIAT.png';
import partner2 from './assets/about-us/partners/JagoAI.png';
import partner3 from './assets/about-us/partners/JagoFarm.png';
import partner4 from './assets/about-us/partners/Ko+Lab.png';
import partner5 from './assets/about-us/partners/Kroom Box.png';
import partner6 from './assets/about-us/partners/Ngolab.png';
import partner7 from './assets/about-us/partners/Sorgummi.png';

const partnersList = [
  { name: 'GIAT', image: partner1 },
  { name: 'JagoAI', image: partner2 },
  { name: 'JagoFarm', image: partner3 },
  { name: 'Ko+Lab', image: partner4 },
  { name: 'Kroom Box', image: partner5 },
  { name: 'Ngolab', image: partner6 },
  { name: 'Sorgummi', image: partner7 },
];

const teamMembers = [
  { name: 'April', image: member1, role: 'Creative Director' },
  { name: 'Dian', image: member2, role: 'Creative Director' },
  { name: 'Taqi', image: member3, role: 'Creative Director' },
  { name: 'Amadea', image: member4, role: 'Creative Director' },
  { name: 'Nadine', image: member5, role: 'Creative Director' },
  { name: 'Naura', image: member6, role: 'Creative Director' },
  { name: 'Anggi', image: member7, role: 'Creative Director' },
  { name: 'Amany', image: member8, role: 'Creative Director' },
  { name: 'Ropaldo', image: member9, role: 'Creative Director' },
];

const iconsList = [Camera, Video, Monitor, Sparkles, ImageIcon, Scissors, Aperture, Smartphone, PenTool, Lightbulb];

const FilmFrame: React.FC<{ partner: { name: string; image: string } }> = ({ partner }) => (
  <div className="w-[280px] sm:w-[320px] h-[220px] flex flex-col justify-between bg-[#111] p-2 flex-shrink-0 border-r border-black/50">
    <div className="h-4 w-full flex justify-around items-center">
      {Array.from({length: 8}).map((_, i) => (
        <div key={`t-${i}`} className="w-5 h-4 bg-[#f0f0f0] rounded-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
      ))}
    </div>
    <div className="w-full h-[150px] bg-white relative overflow-hidden flex items-center justify-center border-4 border-black/80 rounded-sm p-4">
      <img 
        src={partner.image} 
        alt={partner.name}
        className="max-w-full max-h-full object-contain relative z-10" 
      />
    </div>
    <div className="h-4 w-full flex justify-around items-center">
      {Array.from({length: 8}).map((_, i) => (
        <div key={`b-${i}`} className="w-5 h-4 bg-[#f0f0f0] rounded-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
      ))}
    </div>
  </div>
);

const FilmRollSection = ({ filmRollXVal, isCursor }: { filmRollXVal?: any, isCursor?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  const fallbackXVal = useMotionValue(0);
  const xVal = filmRollXVal || fallbackXVal;
  const xPercent = useTransform(xVal, (v: any) => `${v}%`);

  const setsCount = 5;
  const duplicatedPartners = Array(setsCount).fill(partnersList).flat();
  const percentPerSet = 100 / setsCount;

  const normalSpeed = percentPerSet / 20000; // 20s per set
  const maxSpeed = normalSpeed * 40; // 40x speed
  const speedRef = useRef(normalSpeed);
  const lastInView = useRef(false);

  useEffect(() => {
    if (isCursor) return;
    if (isInView && !lastInView.current) {
      speedRef.current = maxSpeed;
    }
    lastInView.current = isInView;
  }, [isInView, maxSpeed, isCursor]);

  useAnimationFrame((time, delta) => {
    if (isCursor) return;
    const decayFactor = Math.pow(0.996, delta);
    speedRef.current = normalSpeed + (speedRef.current - normalSpeed) * decayFactor;

    let newX = xVal.get() - speedRef.current * delta;
    newX = newX % percentPerSet;
    xVal.set(newX);
  });

  return (
    <div ref={containerRef} className="py-24 overflow-hidden relative z-10">
      <h2 className="text-center text-4xl sm:text-5xl font-black text-[#202121] mb-16 uppercase tracking-wider">Our Partners</h2>
      <div className="w-full relative shadow-2xl">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#f0f0f0] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#f0f0f0] to-transparent z-10 pointer-events-none" />
        
        <motion.div 
          className="flex w-max"
          style={{ x: xPercent }}
        >
          {duplicatedPartners.map((partner, index) => (
            <FilmFrame key={index} partner={partner} />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

const CardItem = React.memo(({
  index, 
  activeCard, 
  handleCardClick, 
  isFlipped, 
  dynamicSpacing, 
  deckShift,
  dynamicTransformOrigin
}: {
  index: number;
  activeCard: number | null;
  handleCardClick: (i: number) => void;
  isFlipped: boolean;
  dynamicSpacing: any;
  deckShift: any;
  dynamicTransformOrigin: any;
}) => {
  const isActive = activeCard === index;
  
  const cardAngle = useTransform(() => {
    const spacing = dynamicSpacing.get();
    const pos = index - 4 + deckShift.get();
    const wrappedPos = ((((pos + 4.5) % 9) + 9) % 9) - 4.5;
    return wrappedPos * spacing;
  });

  const highlightProgress = useSpring(isActive ? 1 : 0, { stiffness: 60, damping: 15 });
  

  const inverseRotation = useTransform(() => {
    const wrapped = cardAngle.get() as number;
    const highlight = highlightProgress.get();
    return -wrapped * highlight;
  });

  const rawCardZIndex = useTransform(cardAngle, (angle) => Math.round(100 - Math.abs(angle as number)));
  const cardZIndex = useTransform(() => isActive ? 200 : rawCardZIndex.get());

  return (
    <motion.div
      className="absolute pointer-events-none will-change-transform"
      style={{
        left: '-180px',
        top: '0px',
        transformOrigin: dynamicTransformOrigin,
        rotate: cardAngle,
        zIndex: cardZIndex,
        transform: 'translateZ(0)'
      }}
    >
      <motion.div
        animate={isActive ? { scale: 0.99, y: -250 } : { scale: 1, y: 0 }}
        transition={{ scale: { duration: 0.6, ease: "backOut" }, y: { duration: 0.6, ease: "backOut" } }}
        className="relative w-[360px] h-[450px] cursor-pointer pointer-events-auto will-change-transform"
        style={{ perspective: 1200, rotate: inverseRotation, transform: 'translateZ(0)' }}
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick(index);
        }}
      >
        <motion.div
          animate={isActive ? { y: [-10, 10, -10] } : { y: 0 }}
          transition={isActive ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : {}}
          className="w-full h-full will-change-transform"
          style={{ transform: 'translateZ(0)' }}
        >
          <motion.div
            className="w-full h-full relative will-change-transform"
            animate={{ rotateY: isActive && isFlipped ? 180 : 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            style={{ transformStyle: 'preserve-3d', transform: 'translateZ(0)' }}
          >
            {/* Front */}
            <div 
              className="absolute inset-0 bg-[#202121] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[4px] border-white overflow-hidden flex items-center justify-center will-change-transform"
              style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
            >
              <img 
                src={teamMembers[index]?.image} 
                alt={teamMembers[index]?.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Back */}
            <div 
              className="absolute inset-0 bg-[#202121] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[4px] border-[#f9d02d] flex flex-col items-center p-6 text-center overflow-hidden will-change-transform"
              style={{ transform: 'rotateY(180deg) translateZ(1px)', backfaceVisibility: 'hidden' }}
            >
              <h3 className="text-white font-black text-2xl mb-1 uppercase tracking-wider mt-4">{teamMembers[index]?.name}</h3>
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
});

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
  const activeCardProgress = useRef<number | null>(null);
  const activeCardK = useRef<number>(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const subtextControls = useAnimation();

  const deckShift = useMotionValue(0);

  const dynamicSpacing = useTransform(scrollYProgress, [0, 0.15], [10, 40]);

  useAnimationFrame((t, delta) => {
    if (activeCard === null) {
      const spacing = dynamicSpacing.get();
      const shiftDelta = spacing > 0 ? (0.006 * delta) / spacing : 0;
      deckShift.set(deckShift.get() - shiftDelta);
    }
  });
  
  useEffect(() => {
    if (activeCard === null) {
      subtextControls.start({ opacity: 1 });
    } else {
      const desiredShift = 4 - activeCard;
      
      const currentShift = deckShift.get();
      let diff = ((desiredShift - currentShift) % 9 + 9) % 9;
      if (diff > 4.5) diff -= 9;
      
      const targetShift = currentShift + diff;
      activeCardK.current = Math.round((targetShift - desiredShift) / 9);
      
      animate(deckShift, targetShift, { duration: 0.8, ease: "easeInOut" });
      subtextControls.start({ opacity: 0 });
    }
  }, [activeCard, subtextControls]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (activeCard !== null) {
      const spacing = dynamicSpacing.get();
      
      let activeAngleDelta = 0;
      if (activeCardProgress.current !== null) {
        const delta = latest - activeCardProgress.current;
        const threshold = 0.05; // Delay rotation for a few scrolls
        if (delta > threshold) {
          const excess = delta - threshold;
          activeAngleDelta = excess * 90; // 50% slower rotation
        }
      }
      const shiftDelta = spacing > 0 ? activeAngleDelta / spacing : 0;
      const desiredShift = 4 - activeCard + shiftDelta;
      deckShift.set(desiredShift + activeCardK.current * 9);
    }
  });

  const handleCardClick = (index: number) => {
    if (activeCard === index) {
      setIsFlipped(!isFlipped);
    } else {
      setActiveCard(index);
      activeCardProgress.current = scrollYProgress.get();
      setIsFlipped(false);
    }
  };

  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const dynamicRadius = useTransform(scrollYProgress, [0, 0.5, 1], [1000, 700, 1000]);
  const dynamicTransformOrigin = useTransform(dynamicRadius, (r) => `50% ${r}px`);
  const badgeY = useTransform(dynamicRadius, (r) => r - 180);

  return (
    <div ref={setRefs} id="our-team" className="w-full min-h-[300vh] relative z-20 flex flex-col items-center pb-40 pt-[clamp(120px,18vh,180px)]">
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
      <div className="relative w-full max-w-5xl h-[600px] flex justify-center -mt-32 z-40 pointer-events-none">
        <motion.div 
          className="relative w-0 h-0 pointer-events-none"
          style={{ 
            transformOrigin: dynamicTransformOrigin,
            transform: 'scale(0.85)'
          }}
        >
          {/* Center Badge with Logo and Rotating Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "backOut" }}
            className="absolute w-[360px] h-[360px] bg-[#202121] shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex items-center justify-center pointer-events-auto"
            style={{
              left: '-180px',
              y: badgeY,
              zIndex: 110,
              clipPath: "polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)"
            }}
          >
            {/* Rotating Circular Text (Clockwise / Ke Kanan) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
            >
              <svg className="w-[92%] h-[92%]" viewBox="0 0 360 360">
                <defs>
                  <path
                    id="centerCirclePath"
                    d="M 180, 180 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0"
                  />
                </defs>
                <text className="fill-white font-extrabold text-[21px] tracking-[0.14em]">
                  <textPath
                    href="#centerCirclePath"
                    startOffset="0%"
                    textLength="816"
                    lengthAdjust="spacing"
                  >
                    {"•\u00A0Creative Inside\u00A0•\u00A0Impact Outside\u00A0"}
                  </textPath>
                </text>
              </svg>
            </motion.div>

            {/* Rotating Center Logo (Counter-Clockwise / Ke Kiri) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="relative w-32 h-32 flex items-center justify-center z-10"
            >
              <img
                src={logoDarkTheme}
                alt="Uni-Inside Logo"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </motion.div>
          </motion.div>

          {indices.map((index) => (
            <CardItem 
              key={index} 
              index={index} 
              activeCard={activeCard} 
              handleCardClick={handleCardClick} 
              isFlipped={isFlipped}
              dynamicSpacing={dynamicSpacing}
              deckShift={deckShift}
              dynamicTransformOrigin={dynamicTransformOrigin}
            />
          ))}
        </motion.div>
      </div>

      {/* Overlay to deselect */}
      {activeCard !== null && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => { setActiveCard(null); activeCardProgress.current = null; setIsFlipped(false); }}
        />
      )}
    </div>
  );
});
OurTeamSection.displayName = 'OurTeamSection';



const PageContent = ({ 
  iconIndex, 
  setIsInAboutUs,
  isInAboutUs,
  aboutRef,
  teamRef,
  productsRef,
  servicesRef,
  eventsRef,
  achievementsRef,
  contactRef,
  filmRollXVal,
  isCursor,
  scrollStoryRef,
  onSceneChange,
  activeSection,
  heroTransitionRef,
  heroTransitionProgress,
  aboutTeamTransitionRef,
  teamProductsTransitionRef,
  eventsAchievementsTransitionRef,
  achievementsContactTransitionRef
}: { 
  iconIndex: number, 
  setIsInAboutUs?: (v: boolean) => void,
  isInAboutUs?: boolean,
  aboutRef?: React.RefObject<HTMLDivElement>,
  teamRef?: React.RefObject<HTMLDivElement>,
  productsRef?: React.RefObject<HTMLDivElement>,
  servicesRef?: React.RefObject<HTMLDivElement>,
  eventsRef?: React.RefObject<HTMLDivElement>,
  achievementsRef?: React.RefObject<HTMLDivElement>,
  contactRef?: React.RefObject<HTMLDivElement>,
  filmRollXVal?: any,
  isCursor?: boolean,
  scrollStoryRef?: React.RefObject<ScrollStoryHandle | null>,
  onSceneChange?: (scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS' | null) => void,
  activeSection?: AppSectionId,
  heroTransitionRef?: React.RefObject<HTMLDivElement>,
  heroTransitionProgress?: any,
  aboutTeamTransitionRef?: React.RefObject<HTMLDivElement>,
  teamProductsTransitionRef?: React.RefObject<HTMLDivElement>,
  eventsAchievementsTransitionRef?: React.RefObject<HTMLDivElement>,
  achievementsContactTransitionRef?: React.RefObject<HTMLDivElement>
}) => {
  // Use progress for glow overlay fading
  const fallbackProgress = useMotionValue(0);
  const progress = heroTransitionProgress || fallbackProgress;
  const glowOpacity = useTransform(progress, [0, 1], [0.5, 0]);

  const CurrentIcon = iconsList[iconIndex];

  const textPopStyle = {
    color: '#ffffff',
    lineHeight: 0.9,
    textShadow: '6px 6px 0px #f9d02d, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
  };

  if (isCursor) {
    return (
      <div className="w-full flex flex-col relative z-10 pointer-events-none">
        {/* Placeholder spacer for Hero section + Hero transition spacer (100vh + 30vh = 130vh) */}
        <div className="w-full h-[130vh]" />
        
        {/* About Us Section */}
        <div className="w-full flex flex-col z-10">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-8 lg:px-12 py-32 min-h-screen">
            <div className="flex flex-col">
              <h2 className="text-[80px] sm:text-[100px] lg:text-[130px] font-black leading-[0.9] uppercase text-[#202121]">ABOUT</h2>
              <div className="flex items-center mt-2">
                <h2 className="text-[80px] sm:text-[100px] lg:text-[130px] font-black leading-[0.9] uppercase text-[#202121] mr-4">US</h2>
                
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 overflow-hidden mx-4 flex-shrink-0">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={iconIndex}
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      exit={{ y: '-100%', opacity: 0 }}
                      transition={{ duration: 0.6, ease: "backOut" }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <CurrentIcon className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-[#202121]" strokeWidth={2.5} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.div
                  animate={{ x: [0, 15, 0] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-[#202121]" strokeWidth={4} />
                </motion.div>
              </div>
            </div>
            
            <div className="flex items-center h-full">
              <p className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed text-[#202121]">
                <span className="font-bold">Uni-Inside</span> is a creative studio that focuses on creativity and dedicated <span className="font-bold">collaboration</span> to create wonderful piece of works.
              </p>
            </div>
          </div>
          <FilmRollSection filmRollXVal={filmRollXVal} isCursor={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col relative z-10">
      {/* Hero Section */}
      <div className="relative w-full h-[100vh] flex items-center pt-20 px-8 lg:px-12 z-10">
        {/* Glow overlay for hero */}
        <motion.div className="absolute inset-0 pointer-events-none mix-blend-screen" 
             style={{ 
               background: 'radial-gradient(circle at 75% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)',
               maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
               opacity: glowOpacity
             }} />
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex justify-center items-center order-2 lg:order-1"
          >
            <div className="relative group w-full max-w-[400px] lg:max-w-[500px]">
               <div className="absolute -inset-4 bg-white/5 blur-3xl rounded-full" />
               <HeroModel />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-2 gap-6 relative z-10 lg:pl-16"
          >
            <HeroAnimatedHeading textPopStyle={textPopStyle} />

            <p className="text-xl text-white/90 font-medium tracking-tight mt-2">
              Creative Inside, Impact Outside
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-4">
              <button className="bg-[#f9d02d] text-[#202121] font-bold text-sm px-8 py-3.5 rounded-full uppercase tracking-wide hover:scale-105 transition-transform cursor-pointer">
                Media Kit
              </button>
              <button className="bg-transparent border-2 border-white text-white font-bold text-sm px-8 py-3.5 rounded-full uppercase tracking-wide hover:bg-white hover:text-[#202121] transition-all cursor-pointer">
                Products
              </button>
              <button className="bg-transparent border-2 border-white text-white font-bold text-sm px-8 py-3.5 rounded-full uppercase tracking-wide hover:bg-white hover:text-[#202121] transition-all cursor-pointer">
                Services
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Smooth Transition Spacer */}
      <div ref={heroTransitionRef} className="w-full h-[30vh] relative z-10 pointer-events-none" />

      {/* About Us Section Wrapper (Extends zoom area comfort zone) */}
      <div
        className={`w-full flex flex-col relative z-10 ${isInAboutUs ? 'hide-cursor' : ''}`}
        onMouseEnter={() => setIsInAboutUs?.(true)}
        onMouseLeave={() => setIsInAboutUs?.(false)}
      >
        {/* About Us Section */}
        <div 
          ref={aboutRef}
          id="about-us"
          className="w-full flex flex-col"
        >
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-8 lg:px-12 py-32 min-h-screen">
            <div className="flex flex-col">
              <h2 className="text-[80px] sm:text-[100px] lg:text-[130px] font-black leading-[0.9] uppercase text-[#202121]">ABOUT</h2>
              <div className="flex items-center mt-2">
                <h2 className="text-[80px] sm:text-[100px] lg:text-[130px] font-black leading-[0.9] uppercase text-[#202121] mr-4">US</h2>
                
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 overflow-hidden mx-4 flex-shrink-0">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={iconIndex}
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      exit={{ y: '-100%', opacity: 0 }}
                      transition={{ duration: 0.6, ease: "backOut" }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <CurrentIcon className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-[#202121]" strokeWidth={2.5} />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.div
                  animate={{ x: [0, 15, 0] }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-[#202121]" strokeWidth={4} />
                </motion.div>
              </div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center h-full"
            >
              <p className="text-2xl sm:text-3xl lg:text-4xl leading-relaxed text-[#202121]">
                <span className="font-bold">Uni-Inside</span> is a creative studio that focuses on creativity and dedicated <span className="font-bold">collaboration</span> to create wonderful piece of works.
              </p>
            </motion.div>
          </div>
          <FilmRollSection filmRollXVal={filmRollXVal} isCursor={isCursor} />
        </div>

        {/* About → Team Transition Spacer */}
        <div ref={aboutTeamTransitionRef} className="w-full h-[40vh] relative pointer-events-none" />

        {/* Upper Meet Our Team Padding (Interaction Zone Extension) */}
        <div className="w-full h-32 pointer-events-none" />
      </div>

      {/* Our Team Section */}
      <OurTeamSection ref={teamRef} />

      {/* Spacer for Breathing Room */}
      <div ref={teamProductsTransitionRef} className="w-full min-h-[60vh]" />

      {/* Scroll Story: Products -> Services -> Events */}
      <ScrollStory 
        ref={scrollStoryRef}
        productsRef={productsRef} 
        servicesRef={servicesRef} 
        eventsRef={eventsRef} 
        onSceneChange={onSceneChange}
        activeSection={activeSection}
      />

      {/* Spacer for Breathing Room */}
      <div ref={eventsAchievementsTransitionRef} className="w-full min-h-[50vh]" />

      <div ref={achievementsRef} id="achievements" className="w-full min-h-screen py-32 flex justify-center items-center relative z-10">
        <AchievementsSection />
      </div>

      {/* Spacer for Breathing Room */}
      <div ref={achievementsContactTransitionRef} className="w-full min-h-[50vh]" />

      <div ref={contactRef} id="contact-us" className="w-full min-h-screen pt-32 pb-0 flex flex-col relative z-10">
        <ContactSection />
      </div>

      <Footer />
    </div>
  );
};

const useTransitionInterpolations = (
  progress: any,
  direction: 'dark-to-light' | 'light-to-dark'
) => {
  const isDarkToLight = direction === 'dark-to-light';
  
  const fromBg = isDarkToLight ? '#202121' : '#f0f0f0';
  const toBg = isDarkToLight ? '#f0f0f0' : '#202121';
  
  const fromNavBg = isDarkToLight ? 'rgba(32,33,33,0.85)' : 'rgba(240,240,240,0.85)';
  const toNavBg = isDarkToLight ? 'rgba(240,240,240,0.85)' : 'rgba(32,33,33,0.85)';
  
  const fromNavText = isDarkToLight ? '#ffffff' : '#202121';
  const toNavText = isDarkToLight ? '#202121' : '#ffffff';
  
  const fromLogoDark = isDarkToLight ? 1 : 0;
  const toLogoDark = isDarkToLight ? 0 : 1;

  const bg = useTransform(progress, [0, 1], [fromBg, toBg]);
  const navBg = useTransform(progress, [0, 1], [fromNavBg, toNavBg]);
  const navText = useTransform(progress, [0, 1], [fromNavText, toNavText]);
  const logoDark = useTransform(progress, [0, 1], [fromLogoDark, toLogoDark]);
  const logoLight = useTransform(progress, [0, 1], [1 - fromLogoDark, 1 - toLogoDark]);

  return { bg, navBg, navText, logoDark, logoLight };
};

export default function App() {
  const [iconIndex, setIconIndex] = useState(0);
  const [isInAboutUs, setIsInAboutUs] = useState(false);
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSectionId>('hero');
  const scrollStoryRef = useRef<ScrollStoryHandle | null>(null);
  // True while the viewport is inside ScrollStory — suppresses the normal scroll observer
  const isInScrollStoryRef = useRef(false);

  const filmRollXVal = useMotionValue(0);
  
  const cursorX = useMotionValue(-1000);
  const cursorY = useMotionValue(-1000);
  const { scrollY } = useScroll();

  const aboutRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const achievementsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const heroTransitionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroTransitionProgress } = useScroll({
    target: heroTransitionRef,
    offset: ["start end", "end start"]
  });

  const aboutTeamTransitionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: aboutTeamTransitionProgress } = useScroll({
    target: aboutTeamTransitionRef,
    offset: ["start end", "end start"]
  });

  const teamProductsTransitionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: teamProductsTransitionProgress } = useScroll({
    target: teamProductsTransitionRef,
    offset: ["start end", "end start"]
  });

  const eventsAchievementsTransitionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: eventsAchievementsTransitionProgress } = useScroll({
    target: eventsAchievementsTransitionRef,
    offset: ["start end", "end start"]
  });

  const achievementsContactTransitionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: achievementsContactTransitionProgress } = useScroll({
    target: achievementsContactTransitionRef,
    offset: ["start end", "end start"]
  });

  const [isMagnifierActive, setIsMagnifierActive] = useState(false);

  useEffect(() => {
    const atp = aboutTeamTransitionProgress.get();
    const active = (activeSection === 'about' || (activeSection === 'team' && atp < 0.75)) && isInAboutUs;
    setIsMagnifierActive(active);
  }, [activeSection, isInAboutUs, aboutTeamTransitionProgress]);

  useMotionValueEvent(aboutTeamTransitionProgress, "change", (latest) => {
    const active = (activeSection === 'about' || (activeSection === 'team' && latest < 0.75)) && isInAboutUs;
    setIsMagnifierActive(active);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % iconsList.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      
      const target = e.target as HTMLElement;
      const isClickable = target.closest('a, button, [class*="cursor-pointer"]');
      setIsHoveringClickable(!!isClickable);
    };

    window.addEventListener('mousemove', moveCursor, { passive: true });
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [cursorX, cursorY]);

  useEffect(() => {
    let frame = 0;

    const updateActiveSection = () => {
      // While ScrollStory owns the state, the normal observer must not interfere
      if (isInScrollStoryRef.current) return;

      if (window.scrollY < window.innerHeight * 0.6) {
        setActiveSection('hero');
        return;
      }

      const viewportMid = window.innerHeight * 0.35;
      
      const scrollStoryContainer = scrollStoryRef.current?.getContainer();
      if (scrollStoryContainer) {
        const rect = scrollStoryContainer.getBoundingClientRect();
        if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
          const progress = (viewportMid - rect.top) / rect.height;
          if (progress >= 0.664) {
            setActiveSection('events');
          } else if (progress >= 0.312) {
            setActiveSection('services');
          } else {
            setActiveSection('products');
          }
          return;
        }
      }

      const sectionRefs = [
        { id: 'about' as AppSectionId, ref: aboutRef },
        { id: 'team' as AppSectionId, ref: teamRef },
        { id: 'achievements' as AppSectionId, ref: achievementsRef },
        { id: 'contact' as AppSectionId, ref: contactRef },
      ];

      const candidates = sectionRefs
        .map(({ id, ref }) => {
          const element = ref.current;
          if (!element) return null;
          const rect = element.getBoundingClientRect();

          const containsMid = rect.top <= viewportMid && rect.bottom >= viewportMid;

          let distance = 0;
          if (!containsMid) {
            if (rect.top > viewportMid) {
              distance = rect.top - viewportMid;
            } else {
              distance = viewportMid - rect.bottom;
            }
          }

          return { id, distance, containsMid };
        })
        .filter((item): item is { id: AppSectionId; distance: number; containsMid: boolean } => Boolean(item));

      if (candidates.length === 0) return;

      const best = candidates.reduce((best, current) => {
        if (current.containsMid && !best.containsMid) return current;
        if (!current.containsMid && best.containsMid) return best;
        return current.distance < best.distance ? current : best;
      });

      setActiveSection((prev) => (prev === best.id ? prev : best.id));
    };

    updateActiveSection();

    const handleScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleSceneChange = useCallback((scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS' | null) => {
    if (scene === null) {
      // ScrollStory is releasing control — let the normal observer take over
      isInScrollStoryRef.current = false;
      // Immediately trigger a scroll update so the normal observer can correct the highlight
      window.dispatchEvent(new Event('scroll'));
    } else {
      // ScrollStory is taking / keeping control
      isInScrollStoryRef.current = true;
      const sectionId: AppSectionId =
        scene === 'PRODUCTS' ? 'products' :
        scene === 'SERVICES' ? 'services' : 'events';
      setActiveSection(sectionId);
    }
  }, []);



  // Shared Transition Profile interpolations
  const heroAbout = useTransitionInterpolations(heroTransitionProgress, 'dark-to-light');
  const aboutTeam = useTransitionInterpolations(aboutTeamTransitionProgress, 'light-to-dark');
  const teamProducts = useTransitionInterpolations(teamProductsTransitionProgress, 'dark-to-light');
  const eventsAchievements = useTransitionInterpolations(eventsAchievementsTransitionProgress, 'light-to-dark');
  const achievementsContact = useTransitionInterpolations(achievementsContactTransitionProgress, 'dark-to-light');

  // Inline theme colors per section — no async animate() pipeline, no render-cycle lag.
  // The navbar and background always read the same source at the same time.
  const SECTION_BG: Record<string, string> = {
    hero: '#202121', about: '#f0f0f0', team: '#202121',
    products: '#f0f0f0', services: '#202121', events: '#f0f0f0',
    achievements: '#202121', contact: '#f0f0f0',
  };
  const SECTION_NAV_BG: Record<string, string> = {
    hero: 'rgba(32,33,33,0.85)', about: 'rgba(240,240,240,0.85)', team: 'rgba(32,33,33,0.85)',
    products: 'rgba(240,240,240,0.85)', services: 'rgba(32,33,33,0.85)', events: 'rgba(240,240,240,0.85)',
    achievements: 'rgba(32,33,33,0.85)', contact: 'rgba(240,240,240,0.85)',
  };
  const SECTION_NAV_TEXT: Record<string, string> = {
    hero: '#ffffff', about: '#202121', team: '#ffffff',
    products: '#202121', services: '#ffffff', events: '#202121',
    achievements: '#ffffff', contact: '#202121',
  };
  const SECTION_LOGO_DARK: Record<string, number> = {
    hero: 1, about: 0, team: 1,
    products: 0, services: 1, events: 0,
    achievements: 1, contact: 0,
  };

  const finalBg = useTransform(() => {
    const ac = achievementsContactTransitionProgress.get();
    if (ac > 0 && ac < 1) return achievementsContact.bg.get();

    const ea = eventsAchievementsTransitionProgress.get();
    if (ea > 0 && ea < 1) return eventsAchievements.bg.get();

    const tp = teamProductsTransitionProgress.get();
    if (tp > 0 && tp < 1) return teamProducts.bg.get();

    const atp = aboutTeamTransitionProgress.get();
    if (atp > 0 && atp < 1) return aboutTeam.bg.get();

    const p = heroTransitionProgress.get();
    if (p > 0 && p < 1) return heroAbout.bg.get();

    return SECTION_BG[activeSection] ?? '#202121';
  });

  const finalNavBg = useTransform(() => {
    const ac = achievementsContactTransitionProgress.get();
    if (ac > 0 && ac < 1) return achievementsContact.navBg.get();

    const ea = eventsAchievementsTransitionProgress.get();
    if (ea > 0 && ea < 1) return eventsAchievements.navBg.get();

    const tp = teamProductsTransitionProgress.get();
    if (tp > 0 && tp < 1) return teamProducts.navBg.get();

    const atp = aboutTeamTransitionProgress.get();
    if (atp > 0 && atp < 1) return aboutTeam.navBg.get();

    const p = heroTransitionProgress.get();
    if (p > 0 && p < 1) return heroAbout.navBg.get();

    return SECTION_NAV_BG[activeSection] ?? 'rgba(32,33,33,0.85)';
  });

  const finalNavText = useTransform(() => {
    const ac = achievementsContactTransitionProgress.get();
    if (ac > 0 && ac < 1) return achievementsContact.navText.get();

    const ea = eventsAchievementsTransitionProgress.get();
    if (ea > 0 && ea < 1) return eventsAchievements.navText.get();

    const tp = teamProductsTransitionProgress.get();
    if (tp > 0 && tp < 1) return teamProducts.navText.get();

    const atp = aboutTeamTransitionProgress.get();
    if (atp > 0 && atp < 1) return aboutTeam.navText.get();

    const p = heroTransitionProgress.get();
    if (p > 0 && p < 1) return heroAbout.navText.get();

    return SECTION_NAV_TEXT[activeSection] ?? '#ffffff';
  });

  const finalLogoDarkOpacity = useTransform(() => {
    const ac = achievementsContactTransitionProgress.get();
    if (ac > 0 && ac < 1) return achievementsContact.logoDark.get();

    const ea = eventsAchievementsTransitionProgress.get();
    if (ea > 0 && ea < 1) return eventsAchievements.logoDark.get();

    const tp = teamProductsTransitionProgress.get();
    if (tp > 0 && tp < 1) return teamProducts.logoDark.get();

    const atp = aboutTeamTransitionProgress.get();
    if (atp > 0 && atp < 1) return aboutTeam.logoDark.get();

    const p = heroTransitionProgress.get();
    if (p > 0 && p < 1) return heroAbout.logoDark.get();

    return SECTION_LOGO_DARK[activeSection] ?? 1;
  });

  const finalLogoLightOpacity = useTransform(() => {
    const ac = achievementsContactTransitionProgress.get();
    if (ac > 0 && ac < 1) return achievementsContact.logoLight.get();

    const ea = eventsAchievementsTransitionProgress.get();
    if (ea > 0 && ea < 1) return eventsAchievements.logoLight.get();

    const tp = teamProductsTransitionProgress.get();
    if (tp > 0 && tp < 1) return teamProducts.logoLight.get();

    const atp = aboutTeamTransitionProgress.get();
    if (atp > 0 && atp < 1) return aboutTeam.logoLight.get();

    const p = heroTransitionProgress.get();
    if (p > 0 && p < 1) return heroAbout.logoLight.get();

    return 1 - (SECTION_LOGO_DARK[activeSection] ?? 1);
  });


  useEffect(() => {
    const isDark = SECTION_LOGO_DARK[activeSection] === 1;
    document.documentElement.style.setProperty('--scrollbar-thumb', isDark ? '#f0f0f0' : '#202121');
  }, [activeSection]);

  const cursorScale = isHoveringClickable ? [1, 1.25, 1] : 1;
  const cursorTransition = { repeat: isHoveringClickable ? Infinity : 0, duration: 0.8, ease: "easeInOut" };

  const magX = useMotionTemplate`calc(-1 * ${cursorX}px + 75px)`;
  const magY = useMotionTemplate`calc(-1 * ${cursorY}px + 75px)`;
  const magTransformOrigin = useMotionTemplate`${cursorX}px ${cursorY}px`;
  const magScrollY = useMotionTemplate`calc(-1 * ${scrollY}px)`;
  // Single source of truth: activeSection drives the nav highlight directly
  const getActiveNavHighlight = () => {
    switch (activeSection) {
      case 'about':        return 'ABOUT US';
      case 'team':         return 'OUR TEAM';
      case 'products':     return 'PRODUCTS';
      case 'services':     return 'SERVICES';
      case 'events':       return 'NEWS';
      case 'achievements': return 'ACHIEVEMENTS';
      case 'contact':      return 'CONTACT US';
      default:             return null;
    }
  };

  const activeHighlight = getActiveNavHighlight();

  return (
    <motion.div 
      initial={{ y: 0 }}
      exit={{ y: '100%', opacity: 1, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full relative font-sans overflow-hidden min-h-screen"
    >
      <style>{`
        .hide-cursor, .hide-cursor * {
          cursor: none !important;
        }
      `}</style>



      {/* Dynamic Scroll Background */}
      <motion.div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: finalBg }}
      />



      {/* Fixed Navbar */}
      <motion.nav 
        className="fixed top-0 left-0 w-full flex justify-between items-center px-8 lg:px-12 py-8 z-[100]"
        style={{
          backgroundColor: finalNavBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}
      >
        <a href="#" className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
          <div className="relative w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] flex items-center justify-center">
            <motion.img
              src={logoDarkTheme}
              alt="Uni-Inside Logo Dark Theme"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: finalLogoDarkOpacity }}
            />
            <motion.img
              src={logoLightTheme}
              alt="Uni-Inside Logo Light Theme"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: finalLogoLightOpacity }}
            />
          </div>
        </a>

        <div className="hidden lg:flex items-center gap-5 xl:gap-8">
          {['ABOUT US', 'OUR TEAM', 'PRODUCTS', 'SERVICES', 'NEWS', 'ACHIEVEMENTS', 'CONTACT US'].map((link) => {
            const isHighlightActive = activeHighlight === link;
            return (
              <motion.a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(e) => {
                  if (link === 'PRODUCTS' || link === 'SERVICES' || link === 'NEWS') {
                    e.preventDefault();
                    const sceneName = link === 'NEWS' ? 'EVENTS' : link;
                    scrollStoryRef.current?.scrollToScene(sceneName as any);
                  } else {
                    const targetId = link.toLowerCase().replace(/\s+/g, '-');
                    const el = document.getElementById(targetId);
                    if (el) {
                      e.preventDefault();
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
                className={`text-[12px] xl:text-[14px] font-[800] uppercase tracking-[0.12em] cursor-pointer transition-colors ${
                  isHighlightActive ? '!text-[#f9d02d]' : 'hover:!text-[#f9d02d]'
                }`}
                style={{
                  color: isHighlightActive ? '#f9d02d' : finalNavText,
                  '--nav-color': isHighlightActive ? '#f9d02d' : finalNavText 
                } as any}
              >
                {link}
              </motion.a>
            );
          })}
        </div>

        <div className="hidden sm:block">
          <button className="bg-[#f9d02d] text-[#202121] font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md cursor-pointer">
            Media Kit
          </button>
        </div>
      </motion.nav>

      {/* Main Page Content */}
      <PageContent 
        iconIndex={iconIndex} 
        setIsInAboutUs={setIsInAboutUs} 
        isInAboutUs={isInAboutUs}
        aboutRef={aboutRef}
        teamRef={teamRef}
        productsRef={productsRef}
        servicesRef={servicesRef}
        eventsRef={eventsRef}
        achievementsRef={achievementsRef}
        contactRef={contactRef}
        filmRollXVal={filmRollXVal}
        isCursor={false}
        scrollStoryRef={scrollStoryRef}
        onSceneChange={handleSceneChange}
        activeSection={activeSection}
        heroTransitionRef={heroTransitionRef}
        heroTransitionProgress={heroTransitionProgress}
        aboutTeamTransitionRef={aboutTeamTransitionRef}
        teamProductsTransitionRef={teamProductsTransitionRef}
        eventsAchievementsTransitionRef={eventsAchievementsTransitionRef}
        achievementsContactTransitionRef={achievementsContactTransitionRef}
      />

      {/* Custom Magnifying Glass Cursor — visibility controlled by activeSection and hover bounds */}
      <motion.div
        animate={{
          opacity: isMagnifierActive ? 1 : 0,
          scale: isMagnifierActive ? (isHoveringClickable ? 1.05 : 1) : 0.9,
        }}
        transition={{
          opacity: {
            duration: isMagnifierActive ? 0.18 : 0.15,
            ease: 'easeOut',
          },
          scale: {
            duration: isMagnifierActive ? 0.18 : 0.15,
            ease: 'easeOut',
          }
        }}
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: 0, top: 0,
          x: cursorX, y: cursorY,
          translateX: '-50%', translateY: '-50%',
          width: 150, height: 150,
        }}
      >
        {/* The Glass */}
        <div className="absolute inset-0 rounded-full overflow-hidden border-8 border-[#202121] shadow-2xl">
          <motion.div
            style={{
              position: 'absolute',
              left: 0, top: 0,
              width: '100vw', height: '100vh',
              x: magX,
              y: magY,
              transformOrigin: magTransformOrigin,
              scale: 1.8,
              backgroundColor: finalBg
            }}
          >
            <motion.div 
              style={{ 
                y: magScrollY,
              }}
            >
              <PageContent iconIndex={iconIndex} filmRollXVal={filmRollXVal} isCursor={true} activeSection={activeSection} />
            </motion.div>
          </motion.div>
        </div>
        {/* The Handle */}
        <div className="absolute w-[48px] h-[16px] bg-[#202121] rounded-full shadow-lg" style={{ bottom: -12, right: -12, transform: 'rotate(45deg)' }} />
      </motion.div>
    </motion.div>
  );
}

