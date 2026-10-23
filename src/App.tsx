import React, { useState, useEffect, useRef, useCallback, forwardRef, lazy, Suspense } from 'react';
import { motion, useMotionValue, useMotionTemplate, useInView, useScroll, useTransform, useMotionValueEvent, useAnimationFrame } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { AchievementsSection } from './components/AchievementsSection';
import { Footer } from './components/Footer';
import { ScrollStorySection, type ScrollStorySectionHandle } from './components/ScrollStorySection';
import { IsometricHero } from './components/hero/IsometricHero';
import navbarStyles from './components/Navbar.module.css';
import { AboutIntro, AboutIntroPresentation } from './components/AboutPresentation';
import { AboutEditorialContent } from './components/about/AboutEditorialContent';
import { useNearViewportOnce } from './hooks/useNearViewportOnce';
import { OurTeamSection } from './components/OurTeamSection';
import { type AppSectionId } from './components/ThemeController';
import {usePublicContent} from './public/client';
import {partnerHref,resolveAboutContent,selectManagedItems} from './public/aboutTeam';

import logoDarkTheme from './assets/global/Logo - Dark Theme.svg';
import logoLightTheme from './assets/global/Logo - Light Theme.svg';
import craftsLogo from './assets/global/Uni-Inside Crafts.svg';

const PARTNER_MODULES = import.meta.glob('./assets/about-us/partners/*.{png,jpg,jpeg,svg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const LazyContactSection = lazy(() => import('./components/ContactSection').then(({ ContactSection }) => ({ default: ContactSection })));
const staticPartners = Object.entries(PARTNER_MODULES).map(([path, image]) => {
  const name = path.split('/').pop()?.split('.')[0] || 'Partner';
  return { name, image };
});
const PARTNER_SET_COUNT = 5;
type FilmPartner={name:string;image:string;url?:string|null};
const FilmFrame: React.FC<{ partner:FilmPartner;interactive:boolean }> = ({ partner,interactive }) => (
  <div aria-hidden={!interactive||undefined} className="w-[280px] sm:w-[320px] h-[220px] flex flex-col justify-between bg-[#111] p-2 flex-shrink-0 border-r border-black/50">
    <div className="h-4 w-full flex justify-around items-center">
      {Array.from({length: 8}).map((_, i) => (
        <div key={`t-${i}`} className="w-5 h-4 bg-[#f0f0f0] rounded-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
      ))}
    </div>
    <div className="w-full h-[150px] bg-white relative overflow-hidden flex items-center justify-center border-4 border-black/80 rounded-sm p-4">
      {partner.url?<a href={partner.url} target="_blank" rel="noopener noreferrer" tabIndex={interactive?0:-1} aria-label={partner.name} className="flex h-full w-full items-center justify-center rounded focus-visible:outline-4 focus-visible:outline-[#f9d02d]" style={{pointerEvents:interactive?'auto':'none'}}><img src={partner.image} alt={partner.name} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain relative z-10"/></a>:<img
        src={partner.image} 
        alt={partner.name}
        loading="lazy"
        decoding="async"
        className="max-w-full max-h-full object-contain relative z-10" 
      />}
    </div>
    <div className="h-4 w-full flex justify-around items-center">
      {Array.from({length: 8}).map((_, i) => (
        <div key={`b-${i}`} className="w-5 h-4 bg-[#f0f0f0] rounded-[2px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" />
      ))}
    </div>
  </div>
);

const FilmRollSection = ({ filmRollXVal, isCursor }: { filmRollXVal?: any, isCursor?: boolean }) => {
  const {partners,homepage}=usePublicContent();
  const partnersList=selectManagedItems<FilmPartner>(homepage?.capabilities?.managedPartners===true,partners===null?null:partners.filter(item=>item.image?.secure_url).map(item=>({name:String(item.name),image:String(item.image.secure_url),url:partnerHref(item.website_url)})),staticPartners);
  const duplicatedPartners=Array(PARTNER_SET_COUNT).fill(partnersList).flat() as FilmPartner[];
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  const fallbackXVal = useMotionValue(0);
  const xVal = filmRollXVal || fallbackXVal;
  const xPercent = useTransform(xVal, (v: any) => `${v}%`);

  const percentPerSet = 100 / PARTNER_SET_COUNT;

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
    if (isCursor || !isInView) return;
    const decayFactor = Math.pow(0.996, delta);
    speedRef.current = normalSpeed + (speedRef.current - normalSpeed) * decayFactor;

    let newX = xVal.get() - speedRef.current * delta;
    newX = newX % percentPerSet;
    xVal.set(newX);
  });

  return (
    <div ref={containerRef} data-partner-film={isCursor?'presentation':'live'} className="py-24 overflow-hidden relative z-10">
      <h2 className="text-center text-4xl sm:text-5xl font-black text-[#202121] mb-16 uppercase tracking-wider">{resolveAboutContent(homepage).edit.partnersHeading}</h2>
      <div className="w-full relative shadow-2xl">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#f0f0f0] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#f0f0f0] to-transparent z-10 pointer-events-none" />
        
        <motion.div 
          className="flex w-max"
          style={{ x: xPercent }}
        >
          {duplicatedPartners.map((partner, index) => (
            <FilmFrame key={index} partner={partner} interactive={!isCursor&&index<partnersList.length}/>
          ))}
        </motion.div>
      </div>
      {partnersList.length===0&&<p className="px-8 text-center text-[#202121]/70">Partners will be featured here soon.</p>}
    </div>
  );
};



const PageContent = ({ 
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
  aboutTeamTransitionRef,
  teamProductsTransitionRef,
  eventsAchievementsTransitionRef,
  achievementsContactTransitionRef,
  shouldMountContact
}: { 
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
  scrollStoryRef?: React.RefObject<ScrollStorySectionHandle | null>,
  onSceneChange?: (scene: 'PRODUCTS' | 'SERVICES' | 'EVENTS' | null) => void,
  activeSection?: AppSectionId,
  heroTransitionRef?: React.RefObject<HTMLDivElement>,
  aboutTeamTransitionRef?: React.RefObject<HTMLDivElement>,
  teamProductsTransitionRef?: React.RefObject<HTMLDivElement>,
  eventsAchievementsTransitionRef?: React.RefObject<HTMLDivElement>,
  achievementsContactTransitionRef?: React.RefObject<HTMLDivElement>,
  shouldMountContact?: boolean
}) => {
  if (isCursor) {
    return (
      <div className="w-full flex flex-col relative z-10 pointer-events-none">
        {/* Placeholder for the Hero and its scroll-driven transition range. */}
        <div className="w-full h-[130vh]" />
        
        {/* About Us Section */}
        <div className="w-full flex flex-col z-10">
          <AboutIntroPresentation />
          <AboutEditorialContent presentationOnly />
          <FilmRollSection filmRollXVal={filmRollXVal} isCursor={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col relative z-10">
      <IsometricHero />

      {/* ScrollStory transition range; the shared background supplies its color. */}
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
          <AboutIntro />
          <AboutEditorialContent />
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
      <ScrollStorySection 
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

      {/* The wrapper reserves the section's full height on its own, so the lazy
          implementation never shifts layout. */}
      <div ref={contactRef} id="contact-us" className="w-full min-h-screen pt-32 pb-0 flex flex-col relative z-10">
        {shouldMountContact ? (
          <Suspense fallback={null}>
            <LazyContactSection />
          </Suspense>
        ) : null}
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
  const location = useLocation();
  const [isInAboutUs, setIsInAboutUs] = useState(false);
  const [isHoveringClickable, setIsHoveringClickable] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSectionId>('hero');
  const scrollStoryRef = useRef<ScrollStorySectionHandle | null>(null);
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
  // Load the Contact implementation well before it can be reached so its audio
  // and rope physics are ready by the time the section is interactive. The
  // latch keeps it mounted afterwards so no state is ever thrown away.
  const shouldMountContact = useNearViewportOnce(contactRef, '1500px 0px');

  useEffect(() => {
    const targetId = location.hash.slice(1);
    if (!targetId) return;
    let frame=0,attempts=0;
    const scene=targetId==='products'?'PRODUCTS':targetId==='services'?'SERVICES':targetId==='news'?'EVENTS':null;
    const scroll=()=>{
      if(scene){if(scrollStoryRef.current?.isReady()){scrollStoryRef.current.scrollToScene(scene,'auto');return;}}
      else {const element=document.getElementById(targetId);if(element){element.scrollIntoView({behavior:'auto'});return;}}
      if(++attempts<120)frame=window.requestAnimationFrame(scroll);
    };
    frame=window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

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
  // The magnifier is a pointer affordance; touch-only devices never see it.
  const [hasFinePointer, setHasFinePointer] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: fine)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(pointer: fine)');
    const sync = () => setHasFinePointer(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Mounted a little before it can become visible so the magnified copy never
  // has to lay out during the fade-in.
  const isMagnifierMounted = hasFinePointer && (activeSection === 'about' || activeSection === 'team');

  useEffect(() => {
    const atp = aboutTeamTransitionProgress.get();
    const active = isMagnifierMounted && (activeSection === 'about' || (activeSection === 'team' && atp < 0.75)) && isInAboutUs;
    setIsMagnifierActive(active);
  }, [activeSection, isInAboutUs, isMagnifierMounted, aboutTeamTransitionProgress]);

  useMotionValueEvent(aboutTeamTransitionProgress, "change", (latest) => {
    const active = isMagnifierMounted && (activeSection === 'about' || (activeSection === 'team' && latest < 0.75)) && isInAboutUs;
    setIsMagnifierActive(active);
  });

  // Cursor position keeps being tracked wherever a fine pointer exists, so the
  // magnifier is never shown at a stale location. The hover test that drives a
  // React state update runs only while the magnifier is mounted.
  const isMagnifierMountedRef = useRef(false);
  isMagnifierMountedRef.current = isMagnifierMounted;

  useEffect(() => {
    if (!hasFinePointer) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      if (!isMagnifierMountedRef.current) return;
      const target = e.target as HTMLElement;
      const isClickable = target.closest('a, button, [class*="cursor-pointer"]');
      setIsHoveringClickable(!!isClickable);
    };

    window.addEventListener('mousemove', moveCursor, { passive: true });
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [cursorX, cursorY, hasFinePointer]);

  // Section geometry is measured on layout changes and cached in document
  // space, so an animation frame during scrolling reads `scrollY` only and
  // never forces a synchronous layout of four large sections.
  useEffect(() => {
    let frame = 0;
    let remeasureTimeout = 0;
    let storyBounds: { top: number; height: number } | null = null;
    let sectionBounds: { id: AppSectionId; top: number; bottom: number }[] = [];

    const sectionRefs = [
      { id: 'about' as AppSectionId, ref: aboutRef },
      { id: 'team' as AppSectionId, ref: teamRef },
      { id: 'achievements' as AppSectionId, ref: achievementsRef },
      { id: 'contact' as AppSectionId, ref: contactRef },
    ];

    const measure = () => {
      const scrollTop = window.scrollY;

      const container = scrollStoryRef.current?.getContainer();
      if (container) {
        const rect = container.getBoundingClientRect();
        storyBounds = { top: rect.top + scrollTop, height: rect.height };
      } else {
        storyBounds = null;
      }

      sectionBounds = [];
      for (const { id, ref } of sectionRefs) {
        const element = ref.current;
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        sectionBounds.push({ id, top: rect.top + scrollTop, bottom: rect.bottom + scrollTop });
      }
    };

    const updateActiveSection = () => {
      // While ScrollStory owns the state, the normal observer must not interfere
      if (isInScrollStoryRef.current) return;

      if (window.scrollY < window.innerHeight * 0.6) {
        setActiveSection('hero');
        return;
      }

      const viewportMid = window.scrollY + window.innerHeight * 0.35;

      if (storyBounds && storyBounds.height > 0) {
        const { top, height } = storyBounds;
        if (top <= viewportMid && top + height >= viewportMid) {
          const progress = (viewportMid - top) / height;
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

      if (sectionBounds.length === 0) return;

      const candidates = sectionBounds.map(({ id, top, bottom }) => {
        const containsMid = top <= viewportMid && bottom >= viewportMid;

        let distance = 0;
        if (!containsMid) {
          distance = top > viewportMid ? top - viewportMid : viewportMid - bottom;
        }

        return { id, distance, containsMid };
      });

      const best = candidates.reduce((best, current) => {
        if (current.containsMid && !best.containsMid) return current;
        if (!current.containsMid && best.containsMid) return best;
        return current.distance < best.distance ? current : best;
      });

      setActiveSection((prev) => (prev === best.id ? prev : best.id));
    };

    const remeasureAndUpdate = () => {
      measure();
      updateActiveSection();
    };

    measure();
    updateActiveSection();

    const handleScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
      // One cheap correction once the gesture stops, instead of per frame.
      window.clearTimeout(remeasureTimeout);
      remeasureTimeout = window.setTimeout(remeasureAndUpdate, 150);
    };

    const observer = new ResizeObserver(remeasureAndUpdate);
    observer.observe(document.documentElement);
    sectionRefs.forEach(({ ref }) => { if (ref.current) observer.observe(ref.current); });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', remeasureAndUpdate);
    window.addEventListener('orientationchange', remeasureAndUpdate);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(remeasureTimeout);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', remeasureAndUpdate);
      window.removeEventListener('orientationchange', remeasureAndUpdate);
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

  const getActiveTransition = () => {
    const ac = achievementsContactTransitionProgress.get();
    if (ac > 0 && ac < 1) return achievementsContact;

    const ea = eventsAchievementsTransitionProgress.get();
    if (ea > 0 && ea < 1) return eventsAchievements;

    const tp = teamProductsTransitionProgress.get();
    if (tp > 0 && tp < 1) return teamProducts;

    const atp = aboutTeamTransitionProgress.get();
    if (atp > 0 && atp < 1) return aboutTeam;

    const p = heroTransitionProgress.get();
    if (p >= 0 && p < 1) return heroAbout;

    return null;
  };

  // Every global surface reads the same active scroll profile, so color, logo,
  // text, and the glossy navbar cannot select different section boundaries.
  const finalBg = useTransform(() => {
    const transition = getActiveTransition();
    if (transition) return transition.bg.get();

    return SECTION_BG[activeSection] ?? '#202121';
  });

  const finalNavBg = useTransform(() => {
    const transition = getActiveTransition();
    if (transition) return transition.navBg.get();

    return SECTION_NAV_BG[activeSection] ?? 'rgba(32,33,33,0.85)';
  });

  const finalNavText = useTransform(() => {
    const transition = getActiveTransition();
    if (transition) return transition.navText.get();

    return SECTION_NAV_TEXT[activeSection] ?? '#ffffff';
  });

  const finalLogoDarkOpacity = useTransform(() => {
    const transition = getActiveTransition();
    if (transition) return transition.logoDark.get();

    return SECTION_LOGO_DARK[activeSection] ?? 1;
  });

  const finalLogoLightOpacity = useTransform(() => {
    const transition = getActiveTransition();
    if (transition) return transition.logoLight.get();

    return 1 - (SECTION_LOGO_DARK[activeSection] ?? 1);
  });


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
  const activeSectionHasLightBackground = SECTION_BG[activeSection] === '#f0f0f0';
  const preloadStory = useCallback(() => scrollStoryRef.current?.preload(), []);

  return (
    <motion.div
      className="w-full relative font-sans overflow-x-clip min-h-screen"
      style={{ backgroundColor: finalBg, '--scrollstory-bg': finalBg } as MotionStyle}
    >
      <link rel="preload" as="image" href={logoDarkTheme} />
      <link rel="preload" as="image" href={logoLightTheme} />
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
        className="fixed top-0 left-0 w-full flex justify-between items-center px-8 lg:px-6 xl:px-12 py-3 z-[100]"
        style={{
          backgroundColor: finalNavBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <a href="#" aria-label="Uni-Inside home" className="flex items-center gap-3 flex-shrink-0 cursor-pointer">
          <div className="relative w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] flex items-center justify-center">
            <motion.img
              src={logoDarkTheme}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: finalLogoDarkOpacity }}
            />
            <motion.img
              src={logoLightTheme}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: finalLogoLightOpacity }}
            />
          </div>
        </a>

        <div className="hidden lg:flex items-center gap-[clamp(1.375rem,2vw,2.5rem)]">
          {['ABOUT US', 'OUR TEAM', 'PRODUCTS', 'SERVICES', 'NEWS', 'ACHIEVEMENTS', 'CONTACT US'].map((link) => {
            const isHighlightActive = activeHighlight === link;
            const isStoryLink = link === 'PRODUCTS' || link === 'SERVICES' || link === 'NEWS';
            return (
              <motion.a
                key={link}
                href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
                onMouseEnter={isStoryLink ? preloadStory : undefined}
                onFocus={isStoryLink ? preloadStory : undefined}
                onTouchStart={isStoryLink ? preloadStory : undefined}
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
                className={`text-[12px] xl:text-[14px] font-[800] uppercase tracking-[0.025em] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2 ${
                  isHighlightActive
                    ? activeSectionHasLightBackground ? '!text-[#be9f24]' : '!text-[#f9d02d]'
                    : 'hover:!text-[#f9d02d] focus-visible:!text-[#f9d02d]'
                }`}
                style={{
                  color: isHighlightActive ? activeSectionHasLightBackground ? '#be9f24' : '#f9d02d' : finalNavText,
                }}
              >
                {link}
              </motion.a>
            );
          })}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 xl:gap-5">
          <Link to="/tools" className={`${navbarStyles.uniTools} whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#202121] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d]`}>
            <span>Uni-Tools</span>
          </Link>
          <div className="hidden sm:block">
            <Link to="/media-kit" className={`${navbarStyles.mediaKit} bg-[#f9d02d] text-[#202121] font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md cursor-pointer`}>
              <span>Media Kit</span>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Main Page Content */}
      <PageContent 
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
        aboutTeamTransitionRef={aboutTeamTransitionRef}
        teamProductsTransitionRef={teamProductsTransitionRef}
        eventsAchievementsTransitionRef={eventsAchievementsTransitionRef}
        achievementsContactTransitionRef={achievementsContactTransitionRef}
        shouldMountContact={shouldMountContact}
      />

      {/* Custom Magnifying Glass Cursor — visibility controlled by activeSection and hover bounds */}
      {isMagnifierMounted && (
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
            aria-hidden="true"
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
              <PageContent filmRollXVal={filmRollXVal} isCursor={true} activeSection={activeSection} />
            </motion.div>
          </motion.div>
        </div>
        {/* The Handle */}
        <div className="absolute w-[48px] h-[16px] bg-[#202121] rounded-full shadow-lg" style={{ bottom: -12, right: -12, transform: 'rotate(45deg)' }} />
      </motion.div>
      )}
    </motion.div>
  );
}
