import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import cameramanImg from '../assets/our-services/Cameraman.png';
import dronemanImg from '../assets/our-services/Droneman.png';
import programmerImg from '../assets/our-services/Programmer.png';

const servicesData = [
  { id: 'capture', text: "Capture", img: cameramanImg },
  { id: 'drone', text: "Drone", img: dronemanImg },
  { id: 'code', text: "Code", img: programmerImg }
];

const extendedServices = [
  ...servicesData.map(s => ({ ...s, uniqueId: s.id + '-1' })),
  ...servicesData.map(s => ({ ...s, uniqueId: s.id + '-2' }))
];

const getSlotProps = (slot: number, isMobile: boolean) => {
  switch (slot) {
    case 0: // Right (Large)
      return {
        x: isMobile ? '18vw' : '26vw',
        y: '0px',
        height: isMobile ? '65vh' : '70vh',
        zIndex: 30,
        opacity: 1
      };
    case 1: // Middle (Medium - Programmer)
      return {
        x: isMobile ? '-5vw' : '-8vw',
        y: '0px',
        height: '52vh',
        zIndex: 20,
        opacity: 1
      };
    case 2: // Left (Small - Cameraman)
      return {
        x: isMobile ? '-28vw' : '-34vw',
        y: '0px',
        height: '32vh',
        zIndex: 10,
        opacity: 1
      };
    case 3: // Offscreen Left
      return {
        x: '-80vw',
        y: '0px',
        height: '32vh',
        zIndex: 0,
        opacity: 0
      };
    case 4: // Offscreen Far
      return {
        x: '0vw',
        y: '0px',
        height: '52vh',
        zIndex: 0,
        opacity: 0
      };
    case 5: // Offscreen Right
      return {
        x: '80vw',
        y: '0px',
        height: isMobile ? '65vh' : '70vh',
        zIndex: 0,
        opacity: 0
      };
    default:
      return {
        x: '100vw',
        y: '0px',
        height: '52vh',
        zIndex: 0,
        opacity: 0
      };
  }
};

export const ServicesCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0); 
  const [isMobile, setIsMobile] = useState(false);

  const captureRef = useRef<HTMLSpanElement>(null);
  const droneRef = useRef<HTMLSpanElement>(null);
  const codeRef = useRef<HTMLSpanElement>(null);

  const [widths, setWidths] = useState<{ [key: string]: number }>({
    'Capture': 180,
    'Drone': 140,
    'Code': 120
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWidths({
        'Capture': captureRef.current?.offsetWidth || 180,
        'Drone': droneRef.current?.offsetWidth || 140,
        'Code': codeRef.current?.offsetWidth || 120
      });
    };
    // Let elements mount and layout first
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getSlot = (itemIndex: number) => {
    return (itemIndex - activeIndex + 6) % 6;
  };

  return (
    <div className="w-full h-full relative">
      {/* Hidden measuring elements for exact, responsive layout mapping */}
      <div className="absolute opacity-0 pointer-events-none flex select-none text-[clamp(32px,4.2vw,64px)] font-black leading-none" style={{ top: -9999, left: -9999 }}>
        <span ref={captureRef} style={{ whiteSpace: 'nowrap' }}>Capture</span>
        <span ref={droneRef} style={{ whiteSpace: 'nowrap' }}>Drone</span>
        <span ref={codeRef} style={{ whiteSpace: 'nowrap' }}>Code</span>
      </div>

      {/* Typography Block - positioned at top-left with safe margins */}
      <div className="absolute top-[clamp(120px,18vh,200px)] left-[clamp(32px,8vw,120px)] z-10 pointer-events-none">
        <h2 className="text-[clamp(50px,8vw,115px)] font-black uppercase text-white leading-none tracking-tight drop-shadow-2xl">
          OUR SERVICES
        </h2>
        
        {/* Dynamic Text Row */}
        <div className="flex items-center mt-3">
          <motion.div
            animate={{ width: widths[extendedServices[activeIndex].text] || 150 }}
            transition={{ duration: 0.6, ease: "backOut" }}
            className="relative h-[70px] sm:h-[80px] flex items-center overflow-hidden"
          >
            <AnimatePresence mode="popLayout">
              <motion.span
                key={activeIndex}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.6, ease: "backOut" }}
                className="text-[clamp(32px,4.2vw,64px)] font-black text-white leading-none inline-block absolute left-0"
                style={{ whiteSpace: 'nowrap' }}
              >
                {extendedServices[activeIndex].text}
              </motion.span>
            </AnimatePresence>
          </motion.div>
          <span className="text-[clamp(26px,3.7vw,48px)] text-white/95 font-medium whitespace-nowrap ml-3.5 inline-block">
            for your need
          </span>
        </div>

        <button className="mt-6 bg-[#f9d02d] text-[#202121] font-extrabold text-base sm:text-lg px-8 py-3.5 rounded-full hover:scale-105 transition-transform shadow-lg z-50 relative pointer-events-auto cursor-pointer">
          Check Our Services
        </button>
      </div>

      {/* Grounded Images Area with Viewport Overflow Clipping */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-20">
        {extendedServices.map((service, index) => {
          const slot = getSlot(index);
          const props = getSlotProps(slot, isMobile);

          // Per-character size boosts when occupying the 3rd (rightmost) position (slot 0) or its offscreen mirror (slot 5)
          const rightPositionBoosts: { [id: string]: number } = {
            'drone': 1.45,       // +45% bigger
            'code': 1.25,        // +25% bigger (Programmer)
            'capture': 1.30,     // +30% bigger (Cameraman)
          };

          // Per-character size boosts when occupying the 2nd (middle) position (slot 1) or its offscreen mirror (slot 4)
          const middlePositionBoosts: { [id: string]: number } = {
            'drone': 1.20,       // +20% bigger in the middle
          };

          const isInRightSlot = slot === 0 || slot === 5;
          const isInMiddleSlot = slot === 1 || slot === 4;
          const boost = isInRightSlot
            ? (rightPositionBoosts[service.id] ?? 1)
            : isInMiddleSlot
              ? (middlePositionBoosts[service.id] ?? 1)
              : 1;

          // Parse base height (e.g. "70vh" → 70) and apply boost
          const baseHeightStr = props.height;
          const baseNum = parseFloat(baseHeightStr);
          const baseUnit = baseHeightStr.replace(/[0-9.]/g, '');
          const finalHeight = boost !== 1 ? `${(baseNum * boost).toFixed(1)}${baseUnit}` : baseHeightStr;

          return (
            <motion.div
              key={`${service.uniqueId}-${index}`}
              animate={{
                x: props.x,
                y: props.y,
                opacity: props.opacity,
                zIndex: props.zIndex,
                height: finalHeight
              }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end origin-bottom pointer-events-none"
            >
              <img
                src={service.img}
                alt={service.text}
                className="h-full w-auto object-contain block drop-shadow-2xl select-none"
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
