import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import heroImage from '../assets/hero/hero-image.avif';
import cameraImage from '../assets/about-us/elements/camera.avif';
import cameraFlashImage from '../assets/about-us/elements/camera-flash.avif';
import { useElementVisibility } from '../hooks/useElementVisibility';
import { AboutRotatingIcon } from './AboutRotatingIcon';
import { useAboutStory } from './AboutStoryProvider';

export const ABOUT_VISION = {
  title: 'VISION',
  description: 'To become a creative studio that transforms bold ideas into meaningful visual experiences with lasting impact.',
};

export const ABOUT_MISSION = {
  title: 'MISSION',
  description: 'To combine creativity, collaboration, and technology to deliver thoughtful, high-quality work for every partner.',
};

const AboutIntroContent: React.FC<{ shouldFloat: boolean }> = ({ shouldFloat }) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-stretch px-6 sm:px-8 lg:px-12 py-20 sm:py-28">
      <div ref={imageRef} className="order-1 flex min-h-[15rem] sm:min-h-[21rem] lg:min-h-[clamp(25rem,42vw,34rem)] items-center justify-center overflow-hidden">
        <motion.img
          src={heroImage}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="block h-full max-h-[34rem] w-full object-contain"
          animate={shouldFloat ? { y: [0, -8, 0] } : { y: 0 }}
          transition={shouldFloat ? { duration: 5.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
        />
      </div>
      <div className="order-2 flex min-h-[clamp(25rem,42vw,34rem)] flex-col justify-between text-[#202121]">
        <div>
          <h2 className="text-[clamp(3.25rem,8.9vw,8.125rem)] font-black leading-[0.9] uppercase">ABOUT</h2>
          <div className="mt-2 flex min-w-0 items-center">
            <span className="mr-3 text-[clamp(3.25rem,8.9vw,8.125rem)] font-black leading-[0.9] uppercase">US</span>
            <AboutRotatingIcon />
            <motion.div
              animate={reduceMotion ? { x: 0 } : { x: [0, 15, 0] }}
              transition={reduceMotion ? { duration: 0 } : { repeat: Infinity, duration: 1, ease: 'easeInOut' }}
              className="flex-shrink-0"
            >
              <ChevronRight className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20" strokeWidth={4} />
            </motion.div>
          </div>
        </div>
        <p className="mt-10 text-2xl leading-relaxed sm:text-3xl lg:text-4xl">
          <span className="font-bold">Uni-Inside</span> is a creative studio that focuses on creativity and dedicated <span className="font-bold">collaboration</span> to create wonderful piece of works.
        </p>
      </div>
    </div>
  );
};

/** Normal page owner for the Hero-image visibility work. */
export const AboutIntro: React.FC = () => {
  const visibilityRef = useRef<HTMLDivElement>(null);
  const { isVisible, isPageVisible } = useElementVisibility(visibilityRef, '600px 0px');
  const reduceMotion = useReducedMotion();
  return <div ref={visibilityRef}><AboutIntroContent shouldFloat={isVisible && isPageVisible && !reduceMotion} /></div>;
};

/** Visual-only copy used inside the magnifier: no observer or animation owner. */
export const AboutIntroPresentation: React.FC = () => <AboutIntroContent shouldFloat={false} />;

const AboutPolaroid: React.FC<{ title: string; description: string; floating: boolean; delay: number }> = ({ title, description, floating, delay }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      className="flex aspect-[4/5] min-w-0 flex-col border-2 border-[#202121] bg-[#fffdf5] p-[clamp(0.75rem,2.2vw,1.5rem)] shadow-[0.75rem_0.75rem_0_#202121]"
      animate={floating && !reduceMotion ? { y: [0, -7, 0] } : { y: 0 }}
      transition={floating && !reduceMotion ? { duration: 4.8, delay, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
    >
      <div className="mb-[clamp(0.75rem,2vw,1.25rem)] aspect-[5/3] bg-[#f9d02d] border border-[#202121]/70" aria-hidden="true" />
      <h3 className="text-[clamp(1rem,2.7vw,1.6rem)] font-black tracking-wide text-[#202121]">{title}</h3>
      <p className="mt-2 text-[clamp(0.7rem,1.65vw,1rem)] leading-relaxed text-[#202121]">{description}</p>
    </motion.article>
  );
};

type StoryPresentationProps = {
  isVisible: boolean;
  isPageVisible: boolean;
  presentationOnly: boolean;
};

const AboutVisionMissionStoryPresentation: React.FC<StoryPresentationProps> = ({ isVisible, isPageVisible, presentationOnly }) => {
  const { stage, finishCameraExit, finishPolaroidEntrance } = useAboutStory();
  const entered = stage === 'polaroids-entering' || stage === 'settled';
  const cameraVisible = stage === 'camera' || stage === 'flash' || stage === 'camera-after-flash' || stage === 'camera-exit';
  const showFlash = stage === 'flash';
  const idle = stage === 'settled' && isVisible && isPageVisible;
  return (
    <section className="relative min-h-[88svh] w-full overflow-hidden bg-[#f0f0f0]" aria-label="Vision and mission">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          className="absolute left-0 top-1/2 aspect-square w-[clamp(18rem,47vw,46rem)] -translate-y-1/2"
          initial={false}
          animate={cameraVisible ? { x: stage === 'camera-exit' ? '-115%' : '0%', opacity: 1 } : { x: '-115%', opacity: 0 }}
          transition={stage === 'camera-exit' ? { duration: 0.75, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          onAnimationComplete={() => {
            if (!presentationOnly && stage === 'camera-exit') finishCameraExit();
          }}
          style={{ transformOrigin: 'left center', willChange: stage === 'camera-exit' ? 'transform' : 'auto' }}
        >
          <img src={cameraImage} alt="" className="absolute inset-0 h-full w-full object-contain" decoding="async" />
          <img src={cameraFlashImage} alt="" className="absolute inset-0 h-full w-full object-contain" decoding="async" style={{ opacity: showFlash ? 1 : 0 }} />
        </motion.div>
      </div>
      <motion.div
        className="absolute right-[clamp(1rem,7vw,8rem)] top-1/2 w-[min(62rem,calc(100%_-_2rem))] -translate-y-1/2"
        initial={false}
        animate={entered ? { x: 0, opacity: 1 } : { x: '120vw', opacity: 0 }}
        transition={{ duration: stage === 'polaroids-entering' ? 0.95 : 0, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => {
          if (!presentationOnly && stage === 'polaroids-entering') finishPolaroidEntrance();
        }}
        style={{ willChange: stage === 'polaroids-entering' ? 'transform' : 'auto' }}
      >
        <div className="grid grid-cols-2 gap-[clamp(0.65rem,2.5vw,2rem)]">
          <AboutPolaroid {...ABOUT_VISION} floating={idle} delay={0} />
          <AboutPolaroid {...ABOUT_MISSION} floating={idle} delay={0.35} />
        </div>
      </motion.div>
    </section>
  );
};

/** Normal page owner for preload, intersection, and the one-time start. */
export const AboutVisionMissionStory: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInsideRef = useRef(false);
  const { isVisible, isPageVisible } = useElementVisibility(sectionRef, '0px');
  const { prepare, start, settle } = useAboutStory();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      void prepare();
      observer.disconnect();
    }, { rootMargin: '800px 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, [prepare]);

  useEffect(() => {
    isInsideRef.current = isVisible;
    if (!isVisible) return;
    void prepare().then(() => {
      if (!isInsideRef.current) return;
      if (reduceMotion) {
        settle();
      } else {
        start();
      }
    });
  }, [isVisible, prepare, reduceMotion, settle, start]);
  return (
    <div ref={sectionRef}>
      <AboutVisionMissionStoryPresentation isVisible={isVisible} isPageVisible={isPageVisible} presentationOnly={false} />
    </div>
  );
};

/** Visual-only magnifier copy. */
export const AboutVisionMissionStoryPreview: React.FC = () => (
  <AboutVisionMissionStoryPresentation isVisible={false} isPageVisible={false} presentationOnly />
);
