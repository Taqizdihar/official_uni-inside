import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useAnimationFrame, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { flushSync } from 'react-dom';
import { RiGithubLine, RiInstagramLine, RiLinkedinLine, RiTwitterXLine } from 'react-icons/ri';
import { usePageVisibility } from '../hooks/usePageVisibility';
import member1 from '../assets/our-team/members/1 - April.avif';
import member2 from '../assets/our-team/members/2 - Dian.avif';
import member3 from '../assets/our-team/members/3 - Taqi.avif';
import member4 from '../assets/our-team/members/4 - Amadea.avif';
import member5 from '../assets/our-team/members/5 - Nadine.avif';
import member6 from '../assets/our-team/members/6 - Naura.avif';
import member7 from '../assets/our-team/members/7 - Anggi.avif';
import member8 from '../assets/our-team/members/8 - Amany.avif';
import member9 from '../assets/our-team/members/9 - Ropaldo.avif';
import logoDarkTheme from '../assets/global/Logo - Dark Theme.svg';
import normalModeIcon from '../assets/our-team/icons/normal-mode-icon.avif';
import ringModeIcon from '../assets/our-team/icons/ring-mode-icon.avif';

const socialUrls = { linkedin: 'https://www.linkedin.com/', instagram: 'https://www.instagram.com/', x: 'https://x.com/', github: 'https://github.com/' };
const members = [
  { name: 'April', image: member1, role: 'Chief Executive Officer', description: 'Leads the overall direction of Uni-Inside Studio and coordinates the team in turning creative ideas into focused, collaborative work.' },
  { name: 'Dian', image: member2, role: 'Chief Operating Officer', description: 'Oversees day-to-day operations, coordinates project workflows, and helps collaboration across Uni-Inside Studio and Uni-Inside Craft run effectively.' },
  { name: 'Taqi', image: member3, role: 'Chief Technology Officer', description: 'Leads technology development, digital experiences, and technical systems that support Uni-Inside Studio and Uni-Inside Craft.' },
  { name: 'Amadea', image: member4, role: 'Staff of Specialty', description: 'Supports Uni-Inside Craft operations, including product packaging and occasional hand-painting of printed models.' },
  { name: 'Nadine', image: member5, role: 'Staff of Specialty', description: 'Developed Uni-Smiles, Uni-Inside’s photobooth application, and contributes to the studio’s technology-driven creative experiences.' },
  { name: 'Naura', image: member6, role: 'Staff of Specialty', description: 'Creates social media content for Uni-Inside Studio and helps translate the studio’s work into engaging digital stories.' },
  { name: 'Anggi', image: member7, role: 'Staff of Specialty', description: 'Specializes in hand-painting printed models with careful detail and finishing.' },
  { name: 'Amany', image: member8, role: 'Staff of Specialty', description: 'Creates social media content for Uni-Inside Studio, with a primary focus on posts, feeds, and visual presentation.' },
  { name: 'Ropaldo', image: member9, role: 'Souvenir & 3D Engineer', description: 'Designs custom 3D models and configures models for reliable 3D-printing production.' },
];
const memberForSlot = (slot: number) => ((slot + 4) % members.length + members.length) % members.length;
const normalizedAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;
type TeamViewMode = 'fan' | 'ring';

const CardFaces = React.memo(({ member, flipped, interactive, mode, reducedMotion, onActivate }: {
  member: typeof members[number]; flipped: boolean; interactive: boolean; mode: TeamViewMode; reducedMotion: boolean; onActivate: () => void;
}) => {
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (flipped && document.activeElement === frontButton.current) backButton.current?.focus({ preventScroll: true });
    if (!flipped && document.activeElement === backButton.current) frontButton.current?.focus({ preventScroll: true });
  }, [flipped]);
  return (
  <motion.div
    className="relative h-full w-full"
    animate={{ rotateY: flipped ? 180 : 0 }}
    transition={{ duration: reducedMotion ? 0.1 : 0.65, ease: 'easeInOut' }}
    style={{ transformStyle: 'preserve-3d' }}
  >
    <div aria-hidden={flipped || !interactive} className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border-[4px] border-white bg-[#202121] shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ backfaceVisibility: 'hidden' }}>
      <img src={member.image} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
      <button ref={frontButton} type="button" tabIndex={interactive && !flipped ? 0 : -1} aria-label={`${member.name}, ${mode === 'fan' ? 'select member or show details' : 'show details'}`} onClick={(event) => { event.stopPropagation(); if (interactive && mode === 'fan') onActivate(); }} onKeyDown={(event) => { if (interactive && mode === 'ring' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onActivate(); } }} className="absolute inset-0 rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-[-5px] focus-visible:outline-[#f9d02d]" />
    </div>
    <div aria-hidden={!flipped || !interactive} className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-2xl border-[4px] border-[#f9d02d] bg-[#202121] p-[6%] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ transform: 'rotateY(180deg) translateZ(1px)', backfaceVisibility: 'hidden' }}>
      <button ref={backButton} type="button" tabIndex={interactive && flipped ? 0 : -1} aria-label={`${member.name}, show photo`} onClick={(event) => { event.stopPropagation(); if (interactive && mode === 'fan') onActivate(); }} onKeyDown={(event) => { if (interactive && mode === 'ring' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onActivate(); } }} className="absolute inset-0 rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-[-5px] focus-visible:outline-[#f9d02d]" />
      <div className="pointer-events-none relative flex min-h-0 w-full flex-1 flex-col items-center">
        <h3 className="mb-1 mt-1 text-[clamp(1rem,1.5vw,1.5rem)] font-black uppercase leading-tight tracking-wide text-white">{member.name}</h3>
        <p className="mb-3 text-[clamp(0.65rem,0.75vw,0.7rem)] font-bold uppercase leading-tight tracking-[0.08em] text-[#f9d02d]">{member.role}</p>
        <p className="min-h-0 flex-1 text-[clamp(0.75rem,0.85vw,0.9rem)] leading-snug font-medium text-white/85">{member.description}</p>
      </div>
      <div className="relative z-10 grid w-full grid-cols-4 gap-1 text-white/75">
        {([
          ['linkedin', 'LinkedIn', RiLinkedinLine], ['instagram', 'Instagram', RiInstagramLine],
          ['x', 'X', RiTwitterXLine], ['github', 'GitHub', RiGithubLine],
        ] as const).map(([key, label, Icon]) => (
          <a key={key} href={socialUrls[key]} target="_blank" rel="noopener noreferrer" tabIndex={interactive && flipped ? 0 : -1} aria-label={`${member.name} on ${label}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} className="grid min-h-8 place-items-center rounded hover:bg-[#f9d02d]/20 hover:text-[#f9d02d] focus-visible:outline-2 focus-visible:outline-[#f9d02d]"><Icon className="h-5 w-5" /></a>
        ))}
      </div>
    </div>
  </motion.div>
  );
});

const FanCard = React.memo(({ slot, active, interactive, flipped, deckShift, spacing, radius, orbitProgress, orbitRadiusX, orbitRadiusY, stageHeight, width, orbitWidth, moving, reducedMotion, onClick }: {
  slot: number; active: boolean; interactive: boolean; flipped: boolean;
  deckShift: MotionValue<number>; spacing: MotionValue<number>; radius: MotionValue<number>; orbitProgress: MotionValue<number>;
  orbitRadiusX: number; orbitRadiusY: number; stageHeight: number;
  width: number; orbitWidth: number; moving: boolean; reducedMotion: boolean; onClick: (slot: number) => void;
}) => {
  const member = members[memberForSlot(slot)];
  // The slot's angle is never wrapped. A card enters and leaves beyond the
  // viewport, so the repeated member sequence has no teleport boundary.
  const angle = useTransform(() => (slot + deckShift.get()) * spacing.get());
  const proximity = useTransform(angle, (value) => Math.max(0, 1 - Math.abs(value) / 65));
  const opacity = useTransform(() => {
    const fanOpacity = clamp((105 - Math.abs(angle.get())) / 12, 0, 1);
    const orbitOpacity = clamp((4.6 - Math.abs(slot + deckShift.get())) * 10, 0, 1);
    return mix(fanOpacity, orbitOpacity, orbitProgress.get());
  });
  const depth = useTransform(proximity, (value) => value * 64);
  const scale = useTransform(proximity, (value) => 0.91 + value * 0.09);
  const raise = useTransform(proximity, (value) => -value * 14);
  // The discrete stack order changes when adjacent cards are at equal depth.
  // Their continuous Z, scale, and lift are equal at that crossing.
  const zIndex = useTransform(angle, (value) => active ? 1000 : 400 - Math.round(Math.abs(value) * 2));
  const highlightTarget = useMotionValue(active ? 1 : 0);
  const highlight = useSpring(highlightTarget, { stiffness: 60, damping: 15 });
  useEffect(() => highlightTarget.set(active ? 1 : 0), [active, highlightTarget]);
  const cardWidth = useTransform(() => mix(width, orbitWidth, orbitProgress.get()));
  const cardHeight = useTransform(cardWidth, (value) => value * 1.25);
  const cardLeft = useTransform(cardWidth, (value) => -value / 2);
  const x = useTransform(() => {
    const theta = angle.get() * Math.PI / 180;
    const fanHeight = width * 1.25;
    const fanX = (radius.get() - fanHeight / 2) * Math.sin(theta);
    return mix(fanX, orbitRadiusX * Math.sin(theta), orbitProgress.get());
  });
  const y = useTransform(() => {
    const theta = angle.get() * Math.PI / 180;
    const fanHeight = width * 1.25;
    const fanY = radius.get() + (fanHeight / 2 - radius.get()) * Math.cos(theta) - fanHeight / 2;
    const orbitY = stageHeight / 2 - orbitRadiusY * Math.cos(theta) - orbitWidth * 0.625;
    return mix(fanY, orbitY, orbitProgress.get());
  });
  const rotation = useTransform(() => angle.get() * (1 - orbitProgress.get()));
  const inverseRotation = useTransform(() => -rotation.get() * highlight.get());
  const cardScale = useTransform(() => mix(scale.get(), 1, orbitProgress.get()));
  return (
    <motion.div data-team-member={memberForSlot(slot)} data-team-slot={slot} className="absolute left-1/2 top-0" style={{ x, y, rotate: rotation, width: cardWidth, height: cardHeight, marginLeft: cardLeft, opacity, zIndex, pointerEvents: interactive ? 'auto' : 'none', willChange: moving ? 'transform' : 'auto' }}>
      <motion.div
        data-team-slot={slot}
        aria-hidden={!interactive || undefined}
        className="relative block rounded-2xl"
        style={{ width: cardWidth, height: cardHeight, perspective: 1200, rotate: inverseRotation, z: active ? 0 : depth, scale: cardScale, y: raise, pointerEvents: interactive ? 'auto' : 'none' }}
        animate={{ translateY: active ? -width * 0.45 : 0 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.65, ease: 'easeOut' }}
      >
        <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)]" style={{ opacity: proximity }} />
        <CardFaces member={member} flipped={active && flipped} interactive={interactive} mode="fan" reducedMotion={reducedMotion} onActivate={() => onClick(slot)} />
      </motion.div>
    </motion.div>
  );
});

const RingCard = React.memo(({ index, width, radius, sideSpread, rotation, flipped, reducedMotion, onClick }: {
  index: number; width: number; radius: number; sideSpread: number; rotation: MotionValue<number>;
  flipped: boolean; reducedMotion: boolean; onClick: (index: number) => void;
}) => {
  const [front, setFront] = useState(true);
  const angle = index * (360 / members.length);
  const member = members[index];
  const detailWidth = flipped && width < 200 ? 225 : width;
  const detailHeight = detailWidth * 1.25;
  const position = useTransform(rotation, (value) => {
    const turn = angle + value;
    const sine = Math.sin(turn * Math.PI / 180);
    const cosine = Math.cos(turn * Math.PI / 180);
    // Widen only the side/rear silhouette; the three front cards keep their gap.
    const x = radius * sine + sideSpread * Math.sign(sine) * Math.abs(sine) ** 10;
    return `translate3d(${x}px, 0, ${radius * cosine}px) rotateY(${turn}deg)`;
  });
  const updateFacing = useCallback(() => {
    setFront((current) => {
      const next = Math.abs(normalizedAngle(rotation.get() + angle)) < 78;
      return current === next ? current : next;
    });
  }, [angle, rotation]);
  useEffect(updateFacing, [updateFacing]);
  useMotionValueEvent(rotation, 'change', updateFacing);
  return (
    <motion.div data-team-member={index} data-team-index={index} aria-hidden={!front || undefined} className="absolute top-1/2 left-1/2" style={{ width, height: width * 1.25, marginLeft: -width / 2, marginTop: -width * 0.625, transform: position, transformStyle: 'preserve-3d', pointerEvents: front ? 'auto' : 'none', zIndex: flipped && front ? 100 : 0 }}>
      <div className="relative block rounded-2xl" style={{ width: detailWidth, height: detailHeight, marginLeft: -(detailWidth - width) / 2, marginTop: -(detailHeight - width * 1.25) / 2, transformStyle: 'preserve-3d', userSelect: 'none', WebkitUserSelect: 'none', transition: reducedMotion ? 'none' : 'width 220ms ease, height 220ms ease, margin 220ms ease' }}>
        <CardFaces member={member} flipped={flipped} interactive={front} mode="ring" reducedMotion={reducedMotion} onActivate={() => onClick(index)} />
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#f9d02d]/70 bg-[#202121] shadow-[0_20px_45px_rgba(0,0,0,0.45)]" style={{ transform: 'rotateY(180deg) translateZ(3px)', backfaceVisibility: 'hidden', backgroundImage: 'repeating-linear-gradient(45deg,transparent 0,transparent 20px,rgba(249,208,45,.08) 21px,transparent 23px)' }}>
          <div className="absolute inset-[12%] rounded-full border border-[#f9d02d]/25" />
          <div className="absolute inset-[30%] rounded-full border border-[#f9d02d]/20" />
          <span className="absolute inset-0 grid place-items-center text-5xl font-black text-[#f9d02d]/25">UNI</span>
        </div>
      </div>
    </motion.div>
  );
});

export const OurTeamSection = forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fanRendererRef = useRef<HTMLDivElement>(null);
  const ringRendererRef = useRef<HTMLDivElement>(null);
  const transitionCleanup = useRef<(() => void) | null>(null);
  const inertiaControls = useRef<ReturnType<typeof animate> | null>(null);
  const switchingRef = useRef(false);
  const isTeamInView = useInView(containerRef, { once: false, amount: 0.1 });
  const pageVisible = usePageVisibility();
  const reducedMotion = Boolean(useReducedMotion());
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [mode, setMode] = useState<TeamViewMode>('fan');
  const [switching, setSwitching] = useState(false);
  const [iconMode, setIconMode] = useState<TeamViewMode>('fan');
  const iconOpacity = useMotionValue(1);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [ringFlipped, setRingFlipped] = useState<Set<number>>(() => new Set());
  const [centerSlot, setCenterSlot] = useState(0);
  const centerSlotRef = useRef(0);
  const [overscan, setOverscan] = useState(14);
  const overscanRef = useRef(14);
  const activeProgress = useRef<number | null>(null);
  const deckShift = useMotionValue(0);
  const ringRotation = useMotionValue(0);
  const resumeAt = useRef(0);
  const idleBlend = useRef(1);
  const drag = useRef<{ id: number; startX: number; startY: number; lastX: number; lastTime: number; moved: boolean; velocity: number; index: number | null } | null>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const spacing = useTransform(scrollYProgress, [0, 0.15], [10, 40]);
  const headingFontSize = useTransform(scrollYProgress, [0, 0.15], [clamp(viewportWidth * 0.06, 35, 110), clamp(viewportWidth * 0.032, 28, 44)]);
  const headingGap = useTransform(scrollYProgress, [0, 0.15], [80, 48]);
  const orbitProgress = useTransform(scrollYProgress, [0.12, 0.37], [0, 1]);
  const hintOpacity = useTransform(orbitProgress, (value) => 1 - clamp(value * 2, 0, 1));
  const fanWidth = Math.min(360, Math.max(210, viewportWidth * 0.58));
  const orbitWidth = clamp(viewportWidth * 0.23, 140, 270);
  const stageHeight = Math.min(680, viewportHeight - 185);
  const orbitRadiusX = Math.min(630, viewportWidth * 0.32);
  const orbitRadiusY = clamp((stageHeight - orbitWidth * 1.25) / 2 - 12, 120, 225);
  const ringWidth = clamp(viewportWidth * 0.16, viewportWidth < 640 ? 140 : 220, 320);
  const radiusBase = Math.max(520, viewportWidth / 2 + fanWidth / 2 + 30);
  const radius = useTransform(scrollYProgress, [0, 0.5, 1], [radiusBase, radiusBase * 0.78, radiusBase]);
  const badgeY = useTransform(() => mix(radius.get() - (viewportWidth < 640 ? 120 : 180), stageHeight / 2 - (viewportWidth < 640 ? 120 : 180), orbitProgress.get()));
  // A small perspective correction keeps the projected front-card gap near 24px.
  const ringRadius = (ringWidth + (viewportWidth < 640 ? 16 : 20)) / (2 * Math.sin(Math.PI / members.length)) * (viewportWidth < 640 ? 1 : 0.97);
  const ringSideSpread = Math.max(0, viewportWidth * 0.38 - ringRadius);
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useEffect(() => {
    const update = () => {
      const next = viewportRef.current?.clientWidth ?? window.innerWidth;
      setViewportWidth((previous) => previous === next ? previous : next);
      setViewportHeight((previous) => previous === window.innerHeight ? previous : window.innerHeight);
    };
    const observer = new ResizeObserver(update);
    if (viewportRef.current) observer.observe(viewportRef.current);
    window.addEventListener('resize', update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  useMotionValueEvent(deckShift, 'change', (value) => {
    const next = Math.round(-value);
    if (next !== centerSlotRef.current) {
      centerSlotRef.current = next;
      setCenterSlot(next);
    }
  });
  useMotionValueEvent(spacing, 'change', (value) => {
    const next = Math.ceil(105 / Math.max(value, 1)) + 4;
    if (next !== overscanRef.current) {
      overscanRef.current = next;
      setOverscan(next);
    }
  });
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (mode !== 'fan' || activeSlot === null || activeProgress.current === null) return;
    const delta = Math.max(0, value - activeProgress.current - 0.05);
    deckShift.set(-activeSlot + delta * 90 / Math.max(1, spacing.get()));
  });
  useAnimationFrame((_, delta) => {
    if (!isTeamInView || !pageVisible || reducedMotion || switchingRef.current) return;
    if (mode === 'fan' && activeSlot === null) deckShift.set(deckShift.get() - (0.006 * Math.min(delta, 64)) / spacing.get());
    if (mode === 'ring' && !drag.current && !inertiaControls.current && Date.now() >= resumeAt.current) {
      idleBlend.current = Math.min(1, idleBlend.current + Math.min(delta, 64) / 850);
      ringRotation.set(ringRotation.get() - 0.0065 * Math.min(delta, 64) * idleBlend.current);
    }
  });

  useEffect(() => {
    if (iconMode === mode) return;
    const fadeOut = animate(iconOpacity, 0, { duration: reducedMotion ? 0.05 : 0.14 });
    let fadeIn: ReturnType<typeof animate> | undefined;
    void fadeOut.then(() => {
      setIconMode(mode);
      fadeIn = animate(iconOpacity, 1, { duration: reducedMotion ? 0.08 : 0.18 });
    });
    return () => { fadeOut.stop(); fadeIn?.stop(); };
  }, [iconOpacity, mode, reducedMotion]);

  const cancelInertia = useCallback(() => {
    inertiaControls.current?.stop();
    inertiaControls.current = null;
  }, []);
  const releasePointer = useCallback(() => {
    const current = drag.current;
    if (current && ringRendererRef.current?.hasPointerCapture(current.id)) ringRendererRef.current.releasePointerCapture(current.id);
    drag.current = null;
  }, []);
  useEffect(() => {
    if (isTeamInView && pageVisible) return;
    cancelInertia();
    releasePointer();
    if (switchingRef.current) {
      transitionCleanup.current?.();
      transitionCleanup.current = null;
      switchingRef.current = false;
      setSwitching(false);
    }
    idleBlend.current = 0;
    resumeAt.current = Date.now() + 2000;
  }, [cancelInertia, isTeamInView, pageVisible, releasePointer]);
  useEffect(() => () => { transitionCleanup.current?.(); cancelInertia(); releasePointer(); }, [cancelInertia, releasePointer]);

  // Both independent renderers stay mounted. A short-lived layer maps one
  // visible card per member between their measured screen positions.
  const switchMode = () => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    cancelInertia();
    releasePointer();
    const nextMode: TeamViewMode = mode === 'fan' ? 'ring' : 'fan';
    const source = mode === 'fan' ? fanRendererRef.current : ringRendererRef.current;
    const target = mode === 'fan' ? ringRendererRef.current : fanRendererRef.current;
    if (!source || !target) { switchingRef.current = false; return; }
    const measure = (root: HTMLDivElement, isFan: boolean) => members.map((_, index) => {
      const candidates = Array.from(root.querySelectorAll<HTMLElement>(`[data-team-member="${index}"]`));
      const card = isFan ? candidates.sort((a, b) => Math.abs(Number(a.dataset.teamSlot) + deckShift.get()) - Math.abs(Number(b.dataset.teamSlot) + deckShift.get()))[0] : candidates[0];
      return card?.getBoundingClientRect();
    });
    const startRects = measure(source, mode === 'fan');
    if (nextMode === 'ring') {
      const centerMember = memberForSlot(Math.round(-deckShift.get()));
      ringRotation.set(-centerMember * 360 / members.length);
    } else {
      const frontMember = members.reduce((best, _, index) => Math.abs(normalizedAngle(index * 40 + ringRotation.get())) < Math.abs(normalizedAngle(best * 40 + ringRotation.get())) ? index : best, 0);
      const closestSlot = Array.from({ length: 27 }, (_, index) => index - 13).filter((slot) => memberForSlot(slot) === frontMember).sort((a, b) => Math.abs(a + deckShift.get()) - Math.abs(b + deckShift.get()))[0];
      deckShift.set(-closestSlot);
    }
    setActiveSlot(null);
    activeProgress.current = null;
    setFlipped(false);
    setRingFlipped(new Set());
    if (reducedMotion) {
      setMode(nextMode);
      switchingRef.current = false;
      return;
    }
    let active = true;
    let frame = requestAnimationFrame(() => {
      if (!active) return;
      const endRects = measure(target, nextMode === 'fan');
      const layer = document.createElement('div');
      Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '80', overflow: 'hidden', pointerEvents: 'none', perspective: '1400px' });
      document.body.appendChild(layer);
      const animations: Animation[] = [];
      members.forEach((member, index) => {
        const start = startRects[index];
        const end = endRects[index];
        if (!start || !end || start.width < 1 || end.width < 1) return;
        const clone = document.createElement('div');
        Object.assign(clone.style, { position: 'fixed', left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, overflow: 'hidden', border: '3px solid white', borderRadius: '16px', background: '#202121', boxShadow: '0 20px 50px rgba(0,0,0,.45)', transformOrigin: 'top left', backfaceVisibility: 'hidden' });
        const photo = document.createElement('img');
        photo.src = member.image;
        photo.alt = '';
        Object.assign(photo.style, { width: '100%', height: '100%', objectFit: 'cover' });
        clone.appendChild(photo);
        layer.appendChild(clone);
        animations.push(clone.animate([
          { transform: 'translate3d(0,0,0) scale(1,1)' },
          { transform: `translate3d(${end.left - start.left}px,${end.top - start.top}px,0) scale(${end.width / start.width},${end.height / start.height})` },
        ], { duration: 760, easing: 'cubic-bezier(0.22,0.72,0.18,1)', fill: 'forwards' }));
      });
      source.style.visibility = 'hidden';
      target.style.visibility = 'hidden';
      setSwitching(true);
      const finish = () => {
        if (!active) return;
        flushSync(() => { setMode(nextMode); setSwitching(false); });
        source.style.visibility = nextMode === mode ? 'visible' : 'hidden';
        target.style.visibility = 'visible';
        layer.remove();
        transitionCleanup.current = null;
        switchingRef.current = false;
        idleBlend.current = 0;
        resumeAt.current = Date.now() + 2000;
      };
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => requestAnimationFrame(finish));
      transitionCleanup.current = () => { active = false; animations.forEach((animation) => animation.cancel()); layer.remove(); source.style.visibility = ''; target.style.visibility = ''; };
    });
    transitionCleanup.current = () => { active = false; cancelAnimationFrame(frame); };
  };
  const selectFan = (slot: number) => {
    if (switchingRef.current) return;
    if (activeSlot === slot) { setFlipped((value) => !value); return; }
    setActiveSlot(slot);
    activeProgress.current = scrollYProgress.get();
    setFlipped(false);
    animate(deckShift, -slot, { duration: reducedMotion ? 0.15 : 0.8, ease: 'easeInOut' });
  };
  const selectRing = (index: number) => {
    if (switchingRef.current) return;
    setRingFlipped((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'ring' || switchingRef.current || event.button !== 0 || (event.target as Element).closest('a')) return;
    cancelInertia();
    const target = (event.target as Element).closest<HTMLElement>('[data-team-index]');
    drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastTime: performance.now(), moved: false, velocity: 0, index: target && target.getAttribute('aria-hidden') !== 'true' ? Number(target.dataset.teamIndex) : null };
    idleBlend.current = 0;
    resumeAt.current = Number.POSITIVE_INFINITY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
    if (!current.moved && distance < 8) return;
    current.moved = true;
    const now = performance.now();
    const deltaX = event.clientX - current.lastX;
    const elapsed = Math.max(8, now - current.lastTime);
    ringRotation.set(ringRotation.get() + deltaX * 0.38);
    current.velocity = clamp(current.velocity * 0.62 + deltaX * 0.38 * 1000 / elapsed * 0.38, -900, 900);
    current.lastX = event.clientX;
    current.lastTime = now;
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moved && event.type === 'pointerup' && current.index !== null) {
      selectRing(current.index);
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!current.moved || event.type !== 'pointerup' || reducedMotion || Math.abs(current.velocity) < 24) {
      resumeAt.current = Date.now() + (current.moved ? 2000 : 0);
      return;
    }
    const controls = animate(ringRotation, ringRotation.get() + current.velocity * 0.52, { type: 'inertia', velocity: current.velocity, power: 0.52, timeConstant: 720, restDelta: 0.12 });
    inertiaControls.current = controls;
    void controls.then(() => {
      if (inertiaControls.current !== controls) return;
      inertiaControls.current = null;
      resumeAt.current = Date.now() + 2000;
      idleBlend.current = 0;
    });
  };
  const fanSlots = useMemo(() => Array.from({ length: overscan * 2 + 1 }, (_, index) => centerSlot - overscan + index), [centerSlot, overscan]);

  return (
    <div ref={setRefs} id="our-team" className="relative z-20 flex min-h-[300vh] w-full flex-col items-center overflow-x-clip pt-[clamp(120px,18vh,180px)] pb-40">
      <motion.div style={{ marginBottom: headingGap }} className="sticky top-[90px] z-50 flex w-full flex-col items-center px-4 text-center sm:px-8">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-3 sm:gap-5">
          <motion.h1 style={{ fontSize: headingFontSize }} className="min-w-0 leading-none font-black tracking-tight text-white uppercase drop-shadow-2xl">MEET OUR TEAM</motion.h1>
          <button type="button" onClick={switchMode} disabled={switching} aria-label={mode === 'fan' ? 'Switch to ring view' : 'Switch to fan view'} aria-pressed={mode === 'ring'} title={mode === 'fan' ? 'Ring view' : 'Fan view'} className="relative z-50 grid h-12 w-16 shrink-0 place-items-center rounded-xl border-2 border-[#f9d02d] bg-[#202121] shadow-lg transition-colors hover:bg-[#f9d02d]/20 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d] disabled:cursor-wait"><motion.img src={iconMode === 'fan' ? normalModeIcon : ringModeIcon} alt="" draggable={false} className="h-10 w-14 object-contain" style={{ opacity: iconOpacity }} /></button>
        </div>
        <motion.p style={{ opacity: mode === 'fan' ? (activeSlot !== null ? 0 : hintOpacity) : 1 }} className="mt-4 text-base font-medium tracking-wide text-white/80 sm:text-xl lg:text-2xl">{mode === 'fan' ? 'Click for preview, click again for details!' : 'Drag to rotate • Click a card for details'}</motion.p>
      </motion.div>
      <div ref={viewportRef} className="sticky top-[170px] z-40 w-full max-w-full overflow-visible" style={{ height: stageHeight, perspective: Math.max(650, ringRadius * 2.6) }}>
            <div ref={fanRendererRef} data-team-fan className="absolute inset-0 flex justify-center" style={{ visibility: switching || mode !== 'fan' ? 'hidden' : 'visible', pointerEvents: switching || mode !== 'fan' ? 'none' : 'auto' }} onClick={() => { if (activeSlot !== null) { setActiveSlot(null); activeProgress.current = null; setFlipped(false); } }}>
              <div className="relative h-0 w-0" style={{ transformStyle: 'preserve-3d', perspective: 1600 }}>
                <motion.div initial={{ opacity: 0, scale: 0.3 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.8, ease: 'backOut' }} className="pointer-events-none absolute flex h-[240px] w-[240px] items-center justify-center bg-[#202121] shadow-[0_25px_60px_rgba(0,0,0,0.7)] sm:h-[360px] sm:w-[360px]" style={{ left: viewportWidth < 640 ? -120 : -180, y: badgeY, zIndex: 510, clipPath: 'polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)' }}>
                  <motion.div animate={{ rotate: reducedMotion ? 0 : 360 }} transition={{ repeat: Infinity, duration: 25, ease: 'linear' }} className="pointer-events-none absolute inset-0 flex items-center justify-center"><svg className="h-[92%] w-[92%]" viewBox="0 0 360 360"><defs><path id="centerCirclePath" d="M 180, 180 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0" /></defs><text className="fill-white text-[21px] font-extrabold tracking-[0.14em]"><textPath href="#centerCirclePath" startOffset="0%" textLength="816" lengthAdjust="spacing">{'•\u00A0Creative Inside\u00A0•\u00A0Impact Outside\u00A0'}</textPath></text></svg></motion.div>
                  <motion.div animate={{ rotate: reducedMotion ? 0 : -360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="relative z-10 flex h-24 w-24 items-center justify-center sm:h-32 sm:w-32"><img src={logoDarkTheme} alt="Uni-Inside Logo" className="h-full w-full object-contain drop-shadow-lg" /></motion.div>
                </motion.div>
                {fanSlots.map((slot) => <FanCard key={slot} slot={slot} active={activeSlot === slot} interactive={!switching && mode === 'fan' && Math.abs(slot - centerSlot) <= 4} flipped={flipped} deckShift={deckShift} spacing={spacing} radius={radius} orbitProgress={orbitProgress} orbitRadiusX={orbitRadiusX} orbitRadiusY={orbitRadiusY} stageHeight={stageHeight} width={fanWidth} orbitWidth={orbitWidth} moving={isTeamInView && pageVisible && !reducedMotion && activeSlot === null && mode === 'fan'} reducedMotion={reducedMotion} onClick={selectFan} />)}
              </div>
            </div>
            <div ref={ringRendererRef} data-team-ring-renderer className="absolute inset-0 flex items-start justify-center pt-12 sm:pt-36" style={{ visibility: switching || mode !== 'ring' ? 'hidden' : 'visible', pointerEvents: switching || mode !== 'ring' ? 'none' : 'auto', touchAction: 'pan-y', cursor: 'grab' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <motion.div data-team-ring className="relative h-[min(300px,45vh)] w-full" style={{ rotateX: -8, transformStyle: 'preserve-3d', transformOrigin: 'center center', willChange: isTeamInView && pageVisible && !reducedMotion && mode === 'ring' ? 'transform' : 'auto', scale: viewportWidth < 640 ? 0.85 : 1 }}>
                {members.map((_, index) => <RingCard key={index} index={index} width={ringWidth} radius={ringRadius} sideSpread={ringSideSpread} rotation={ringRotation} flipped={ringFlipped.has(index)} reducedMotion={reducedMotion} onClick={selectRing} />)}
              </motion.div>
            </div>
      </div>
      {mode === 'fan' && activeSlot !== null && <div className="fixed inset-0 z-30" onClick={() => { setActiveSlot(null); activeProgress.current = null; setFlipped(false); }} />}
    </div>
  );
});
OurTeamSection.displayName = 'OurTeamSection';
