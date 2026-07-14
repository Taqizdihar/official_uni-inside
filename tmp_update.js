const fs = require('fs');

const appTsxContent = `import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useMotionTemplate, AnimatePresence, useAnimation, useInView } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles, Camera, Video, Monitor, Image as ImageIcon, Scissors, Aperture, Smartphone, PenTool, Lightbulb } from 'lucide-react';

const AboutContent = ({ iconIndex }: { iconIndex: number }) => {
  const iconsList = [Camera, Video, Monitor, Sparkles, ImageIcon, Scissors, Aperture, Smartphone, PenTool, Lightbulb];
  const CurrentIcon = iconsList[iconIndex];

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-8 lg:px-12 py-32 min-h-screen">
      <div className="flex flex-col">
        <h2 className="text-[80px] sm:text-[100px] lg:text-[130px] font-black leading-[0.9] uppercase text-[#202121]">ABOUT</h2>
        <div className="flex items-center mt-2">
          <h2 className="text-[80px] sm:text-[100px] lg:text-[130px] font-black leading-[0.9] uppercase text-[#202121] mr-4">US</h2>
          
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 overflow-hidden mx-4 flex-shrink-0">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={iconIndex}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.6, ease: "backOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CurrentIcon className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-[#202121]" strokeWidth={2.5} />
              </motion.div>
            </AnimatePresence>
          </div>

          <motion.div
            animate={{ x: [0, 20, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="flex-shrink-0"
          >
            <ChevronRight className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-[#202121]" strokeWidth={3} />
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
  );
};

const FilmFrame = ({ logo }: { logo: string }) => (
  <div className="w-[280px] sm:w-[320px] h-[220px] flex flex-col justify-between bg-[#111] p-2 flex-shrink-0 border-r border-black/50">
    <div className="h-4 w-full flex justify-around items-center">
      {Array.from({length: 8}).map((_, i) => (
        <div key={\`t-\${i}\`} className="w-5 h-4 bg-[#f0f0f0] rounded-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
      ))}
    </div>
    <div className="w-full h-[150px] bg-gray-200 relative overflow-hidden flex items-center justify-center border-4 border-black/80 rounded-sm">
      <div className="absolute inset-0 bg-[#4a4a4a] mix-blend-overlay pointer-events-none opacity-20" />
      <img src={logo} alt="Partner" className="w-[70%] h-auto object-contain drop-shadow-md" />
    </div>
    <div className="h-4 w-full flex justify-around items-center">
      {Array.from({length: 8}).map((_, i) => (
        <div key={\`b-\${i}\`} className="w-5 h-4 bg-[#f0f0f0] rounded-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
      ))}
    </div>
  </div>
);

const FilmRollSection = () => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "0px 0px -100px 0px" });

  const partners = [
    "https://placehold.co/300x150/e2e8f0/202121?text=KroomBox&font=poppins",
    "https://placehold.co/300x150/e2e8f0/202121?text=JAGO+AI&font=poppins",
    "https://placehold.co/300x150/e2e8f0/202121?text=JAGOFARM&font=poppins",
    "https://placehold.co/300x150/e2e8f0/202121?text=GIAT&font=poppins"
  ];
  
  const basePartners = [...partners, ...partners]; 
  const setsCount = 16;
  const duplicatedPartners = Array(setsCount).fill(basePartners).flat();
  const percentPerSet = 100 / setsCount;

  useEffect(() => {
    if (isInView) {
      const sequence = async () => {
        controls.set({ x: \`-\${percentPerSet * 10}%\` });
        await controls.start({
          x: \`-\${percentPerSet * 9}%\`,
          transition: { duration: 1.2, ease: "easeOut" }
        });
        controls.start({
          x: [\`-\${percentPerSet * 9}%\`, \`-\${percentPerSet * 8}%\`],
          transition: { duration: 15, ease: "linear", repeat: Infinity }
        });
      };
      sequence();
    } else {
      controls.stop();
    }
  }, [isInView, controls]);

  return (
    <div className="bg-[#f0f0f0] py-24 overflow-hidden" ref={ref}>
      <h2 className="text-center text-4xl sm:text-5xl font-black text-[#202121] mb-16 uppercase tracking-wider">Our Partners</h2>
      <div className="w-full relative shadow-2xl">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#f0f0f0] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#f0f0f0] to-transparent z-10 pointer-events-none" />
        
        <motion.div 
          className="flex w-max"
          animate={controls}
        >
          {duplicatedPartners.map((logo, index) => (
            <FilmFrame key={index} logo={logo} />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 4;
  
  const [iconIndex, setIconIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHoveringAbout, setIsHoveringAbout] = useState(false);
  
  const scrollY = useMotionValue(0);
  const cursorX = useMotionValue(-1000);
  const cursorY = useMotionValue(-1000);

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % 10);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      scrollY.set(window.scrollY);
      if (window.scrollY > window.innerHeight - 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', moveCursor, { passive: true });
    
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', moveCursor);
    };
  }, []);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  };

  const textPopStyle = {
    color: '#ffffff',
    lineHeight: 0.9,
    textShadow: '6px 6px 0px #f9d02d, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
  };

  return (
    <div className="font-sans text-white relative">
      {/* Navigation Bar */}
      <nav className={\`fixed top-0 left-0 w-full flex justify-between items-center px-8 lg:px-12 py-8 z-50 transition-colors duration-500 \${isScrolled ? 'bg-[#f0f0f0]/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}\`}>
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer">
          <Sparkles className={\`transition-colors duration-500 \${isScrolled ? 'text-[#202121]' : 'text-[#f9d02d]'}\`} size={28} />
          <span className={\`text-xl font-black tracking-wider uppercase transition-colors duration-500 \${isScrolled ? 'text-[#202121]' : 'text-white'}\`}>UNI-INSIDE</span>
        </div>

        {/* Center Links */}
        <div className="hidden lg:flex items-center gap-10">
          {['ABOUT US', 'OUR TEAM', 'PRODUCTS', 'SERVICES', 'CONTACT US'].map((link) => (
            <a
              key={link}
              href={\`#\${link.toLowerCase().replace(/\\s+/g, '-')}\`}
              className={\`text-[10px] font-[800] uppercase tracking-[0.25em] transition-colors duration-200 \${isScrolled ? 'text-[#202121] hover:text-[#f9d02d]' : 'text-white hover:text-[#f9d02d]'}\`}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right CTA */}
        <div className="hidden sm:block">
          <button className="bg-[#f9d02d] text-[#202121] font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md">
            Media Kit
          </button>
        </div>
      </nav>

      {/* Main Hero Content */}
      <div className="relative min-h-screen bg-[#202121] overflow-hidden">
        {/* Subtle Radial Glow Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 75% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)'
          }}
        />

        <main className="relative z-10 w-full h-full min-h-screen flex items-center pt-20 px-8 lg:px-12">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center h-full">
            
            {/* Left Column: Visual Asset */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex justify-center items-center order-2 lg:order-1"
            >
              <div className="relative group w-full max-w-[400px] lg:max-w-[500px]">
                 <div className="absolute -inset-4 bg-white/5 blur-3xl rounded-full" />
                 <img
                   src="https://placehold.co/500x500/202121/ffffff?text=3D+Asset+Placeholder"
                   alt="3D Asset Placeholder"
                   className="relative w-full h-auto object-contain drop-shadow-2xl"
                 />
              </div>
            </motion.div>

            {/* Right Column: Typography & CTAs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="flex flex-col items-center lg:items-start text-center lg:text-left order-1 lg:order-2 gap-6"
            >
              <h1 className="flex flex-col font-black uppercase w-full">
                <span className="text-6xl sm:text-7xl lg:text-[110px]" style={textPopStyle}>
                  CREATIVE
                </span>
                <span className="text-6xl sm:text-7xl lg:text-[110px]" style={textPopStyle}>
                  STUDIO
                </span>
              </h1>

              <p className="text-xl text-white/90 font-medium tracking-tight mt-2">
                Creative Inside, Impact Outside
              </p>

              {/* Buttons Row */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-4">
                <button className="bg-[#f9d02d] text-[#202121] font-bold text-sm px-8 py-3.5 rounded-full uppercase tracking-wide hover:scale-105 transition-transform">
                  Media Kit
                </button>
                <button className="bg-transparent border-2 border-white text-white font-bold text-sm px-8 py-3.5 rounded-full uppercase tracking-wide hover:bg-white hover:text-[#202121] transition-all">
                  Products
                </button>
                <button className="bg-transparent border-2 border-white text-white font-bold text-sm px-8 py-3.5 rounded-full uppercase tracking-wide hover:bg-white hover:text-[#202121] transition-all">
                  Services
                </button>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
          {currentSlide > 0 && (
            <button 
              onClick={handlePrevSlide}
              className="mr-2 cursor-pointer hover:-translate-x-1 transition-transform text-white"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
          )}
          
          <div className="flex items-center gap-3">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={\`h-2 rounded-full cursor-pointer transition-all duration-300 \${
                  index === currentSlide ? 'w-12 bg-white' : 'w-2 bg-white/40 hover:bg-white/100'
                }\`}
              />
            ))}
          </div>

          {currentSlide < totalSlides - 1 && (
            <button 
              onClick={handleNextSlide}
              className="ml-2 cursor-pointer hover:translate-x-1 transition-transform text-white"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* About Us Section */}
      <div 
        id="about-us"
        className={\`relative bg-[#f0f0f0] \${isHoveringAbout ? 'cursor-none' : ''}\`}
        onMouseEnter={() => setIsHoveringAbout(true)}
        onMouseLeave={() => setIsHoveringAbout(false)}
      >
        <AboutContent iconIndex={iconIndex} />

        {/* Magnifier Duplicated Layer */}
        <motion.div 
          className="fixed inset-0 pointer-events-none z-40 overflow-hidden"
          style={{
            clipPath: useMotionTemplate\`circle(140px at \${cursorX}px \${cursorY}px)\`,
            opacity: isHoveringAbout ? 1 : 0,
            display: isHoveringAbout ? 'block' : 'none'
          }}
        >
          <motion.div 
            className="w-full h-full"
            style={{ 
              transformOrigin: useMotionTemplate\`\${cursorX}px \${cursorY}px\`,
              transform: 'scale(1.5)'
            }}
          >
            <motion.div 
              className="absolute top-0 left-0 w-full"
              style={{ y: useMotionTemplate\`-\${scrollY}px\` }}
            >
               <div className="h-[100vh] w-full" />
               <div className="bg-[#f0f0f0]">
                  <AboutContent iconIndex={iconIndex} />
               </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Magnifier Handle/Ring */}
        <motion.div 
          className="fixed pointer-events-none z-50"
          style={{
            left: 0, top: 0,
            x: cursorX, y: cursorY,
            translateX: '-50%', translateY: '-50%',
            opacity: isHoveringAbout ? 1 : 0,
            display: isHoveringAbout ? 'block' : 'none'
          }}
        >
          <div className="w-[280px] h-[280px] border-[12px] border-[#202121] rounded-full shadow-2xl" />
          <div className="absolute w-[80px] h-[24px] bg-[#202121] rounded-full shadow-xl" style={{ bottom: -18, right: -18, transform: 'rotate(45deg)' }} />
        </motion.div>
      </div>

      {/* Film Roll Section */}
      <FilmRollSection />
    </div>
  );
}
`;

fs.writeFileSync('./src/App.tsx', appTsxContent);
