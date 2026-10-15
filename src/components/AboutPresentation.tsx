import React, { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useElementVisibility } from '../hooks/useElementVisibility';
import { AboutComplexLogoParallax } from './about/AboutComplexLogoParallax';

const AboutIntroContent: React.FC<{ shouldFloat: boolean; parallaxActive: boolean; interactive: boolean }> = ({ shouldFloat, parallaxActive, interactive }) => {
  return (
    <section aria-label="About Us" aria-hidden={!interactive || undefined} className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-stretch px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
      <div className="order-1 flex min-h-[15rem] sm:min-h-[21rem] lg:min-h-[clamp(25rem,42vw,34rem)] items-center justify-center overflow-hidden">
        {interactive ? (
          <motion.div
            className="relative aspect-square w-full max-w-[34rem] flex-none"
            animate={shouldFloat ? { y: [0, -8, 0] } : { y: 0 }}
            transition={shouldFloat ? { duration: 5.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
          >
            <AboutComplexLogoParallax active={parallaxActive} interactive />
          </motion.div>
        ) : (
          <div className="relative aspect-square w-full max-w-[34rem] flex-none">
            <AboutComplexLogoParallax active={false} interactive={false} />
          </div>
        )}
      </div>
      <div className="order-2 flex min-h-[clamp(25rem,42vw,34rem)] flex-col justify-center text-[#202121]">
        <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.2em] sm:text-sm">ABOUT UNI-INSIDE STUDIO</p>
        <h2 className="text-[clamp(3.25rem,8.9vw,8.125rem)] font-black leading-[0.82] tracking-[-0.065em] uppercase">
          ABOUT<br />US
        </h2>
        <p className="mt-7 max-w-[35rem] text-[clamp(1.35rem,3vw,2.25rem)] font-black leading-[1.03] tracking-[-0.035em]">
          CREATIVE BY NATURE.<br />TECHNICAL BY DESIGN.
        </p>
        <p className="mt-5 max-w-[35rem] text-base leading-relaxed sm:text-lg">
          We are a Bandung-based creative technology studio where visual production, digital experimentation, and 3D fabrication meet. We collaborate to turn ideas into stories, systems, and physical products with purpose.
        </p>
        <ul aria-label="Studio disciplines" className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#202121]/30 pt-4 text-[0.65rem] font-extrabold tracking-[0.12em] sm:text-xs">
          <li>MULTIMEDIA</li>
          <li>CREATIVE TECHNOLOGY</li>
          <li>3D PRINTING</li>
        </ul>
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
