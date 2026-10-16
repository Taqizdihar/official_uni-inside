import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import cameraIcon from '../assets/about-us/icons/camera-icon.avif';
import droneIcon from '../assets/about-us/icons/drone-icon.avif';
import printerIcon from '../assets/about-us/icons/3d-printer-icon.avif';
import { useElementVisibility } from '../hooks/useElementVisibility';
import { AboutComplexLogoParallax } from './about/AboutComplexLogoParallax';

const AboutIntroContent: React.FC<{ shouldFloat: boolean; parallaxActive: boolean; interactive: boolean }> = ({ shouldFloat, parallaxActive, interactive }) => {
  return (
    <section aria-label="About Us" aria-hidden={!interactive || undefined} className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 px-6 pt-24 pb-10 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-14 lg:px-10 lg:pt-[clamp(7.5rem,15vh,9.5rem)] lg:pb-4 2xl:max-w-[88rem] 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] 2xl:gap-16 2xl:-translate-y-8 2xl:scale-[1.08]">
      <div className="order-1 flex min-h-[15rem] items-center justify-center overflow-hidden lg:min-h-0">
        {interactive ? (
          <motion.div
            className="relative aspect-square w-full max-w-[24.5rem] flex-none xl:max-w-[30rem] 2xl:max-w-[34rem]"
            style={{ scale: 1.08, x: 4 }}
            animate={shouldFloat ? { y: [-4, -12, -4] } : { y: -4 }}
            transition={shouldFloat ? { duration: 5.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
          >
            <AboutComplexLogoParallax active={parallaxActive} interactive />
          </motion.div>
        ) : (
          <div className="relative aspect-square w-full max-w-[24.5rem] flex-none scale-[1.08] -translate-x-1 -translate-y-1 xl:max-w-[30rem] 2xl:max-w-[34rem]">
            <AboutComplexLogoParallax active={false} interactive={false} />
          </div>
        )}
      </div>
      <div className="relative top-1 order-2 flex min-w-0 max-w-[27rem] flex-col justify-center text-[#202121] xl:max-w-[34rem] 2xl:max-w-[40rem]">
        <h2 className="text-[clamp(3.75rem,9vw,7rem)] font-black leading-[0.94] tracking-normal uppercase 2xl:text-[clamp(7rem,7.5vw,8rem)]">
          <span className="block">ABOUT</span>
          <span className="mt-2 flex items-center gap-3 sm:gap-4">
            <span>US</span>
            <span aria-hidden="true" className="flex min-w-0 items-center gap-3 sm:gap-4">
              <img src={cameraIcon} alt="" className="h-[clamp(3.25rem,8.2vw,5.5rem)] w-[clamp(3.25rem,8.2vw,5.5rem)] shrink-0 object-contain 2xl:h-24 2xl:w-24" />
              <img src={droneIcon} alt="" className="h-[clamp(3.25rem,8.2vw,5.5rem)] w-[clamp(3.25rem,8.2vw,5.5rem)] shrink-0 object-contain 2xl:h-24 2xl:w-24" />
              <img src={printerIcon} alt="" className="h-[clamp(3.25rem,8.2vw,5.5rem)] w-[clamp(3.25rem,8.2vw,5.5rem)] shrink-0 object-contain 2xl:h-24 2xl:w-24" />
            </span>
          </span>
        </h2>
        <p className="mt-4 max-w-[35rem] text-[clamp(0.85rem,1.8vw,1.15rem)] font-black leading-tight tracking-[-0.025em] sm:mt-4 2xl:text-[clamp(1.15rem,1.8vw,1.25rem)]">
          CREATIVE BY NATURE, TECHNICAL BY DESIGN
        </p>
        <p className="mt-7 w-full max-w-[35rem] text-[clamp(0.95rem,1.65vw,1.1rem)] leading-[1.32] 2xl:text-[clamp(1.1rem,1.65vw,1.25rem)]">
          We are a Bandung-based creative technology studio where visual production, digital experimentation, and 3D fabrication meet. We collaborate to turn ideas into stories, systems, and physical products with purpose.
        </p>
        <p aria-label="Studio disciplines" className="mt-3 w-full max-w-[35rem] border-t-2 border-[#202121] pt-2 text-[clamp(0.7rem,1.55vw,1rem)] font-extrabold leading-tight tracking-[-0.015em] 2xl:text-[clamp(1rem,1.55vw,1.1rem)]">
          <span className="block w-full bg-[#f9d02d] px-1 py-1 text-justify [text-align-last:justify]">MULTIMEDIA • CREATIVE TECHNOLOGY • 3D PRINTING</span>
        </p>
      </div>
    </section>
  );
};

/** Normal page owner for the Hero-image visibility work. */
export const AboutIntro: React.FC = () => {
  const visibilityRef = useRef<HTMLDivElement>(null);
  const { isVisible, isPageVisible } = useElementVisibility(visibilityRef, '600px 0px');
  const reduceMotion = useReducedMotion();
  return (
    <div ref={visibilityRef}>
      <AboutIntroContent
        shouldFloat={isVisible && isPageVisible && !reduceMotion}
        parallaxActive={isVisible && isPageVisible}
        interactive
      />
    </div>
  );
};

/** Visual-only copy used inside the magnifier: no observer or animation owner. */
export const AboutIntroPresentation: React.FC = () => (
  <AboutIntroContent shouldFloat={false} parallaxActive={false} interactive={false} />
);
