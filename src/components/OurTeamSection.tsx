import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useAnimationFrame, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
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

const members = [
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
const memberForSlot = (slot: number) => ((slot + 4) % members.length + members.length) % members.length;
const normalizedAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;
type TeamViewMode = 'fan' | 'ring';

const CardFaces = React.memo(({ member, flipped }: { member: typeof members[number]; flipped: boolean }) => (
  <motion.div
    className="relative h-full w-full"
    animate={{ rotateY: flipped ? 180 : 0 }}
    transition={{ duration: 0.65, ease: 'easeInOut' }}
    style={{ transformStyle: 'preserve-3d' }}
  >
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border-[4px] border-white bg-[#202121] shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ backfaceVisibility: 'hidden' }}>
      <img src={member.image} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
    </div>
    <div className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-2xl border-[4px] border-[#f9d02d] bg-[#202121] p-[6%] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ transform: 'rotateY(180deg) translateZ(1px)', backfaceVisibility: 'hidden' }}>
      <h3 className="mt-4 mb-1 text-2xl font-black uppercase tracking-wider text-white">{member.name}</h3>
      <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#f9d02d]">{member.role}</p>
      <p className="mb-auto text-sm leading-relaxed font-medium text-white/80">Passionate about blending bold design with interactive technology to create stunning visual experiences.</p>
      <div className="mb-4 flex gap-5 text-white/50" aria-hidden="true"><Twitter className="h-5 w-5" /><Linkedin className="h-5 w-5" /><Instagram className="h-5 w-5" /></div>
    </div>
  </motion.div>
));

const FanCard = React.memo(({ slot, active, interactive, flipped, deckShift, spacing, origin, width, moving, onClick }: {
  slot: number; active: boolean; interactive: boolean; flipped: boolean;
  deckShift: MotionValue<number>; spacing: MotionValue<number>; origin: MotionValue<string>;
  width: number; moving: boolean; onClick: (slot: number) => void;
}) => {
  const member = members[memberForSlot(slot)];
  // The slot's angle is never wrapped. A card enters and leaves beyond the
  // viewport, so the repeated member sequence has no teleport boundary.
  const angle = useTransform(() => (slot + deckShift.get()) * spacing.get());
  const proximity = useTransform(angle, (value) => Math.max(0, 1 - Math.abs(value) / 65));
  const opacity = useTransform(angle, (value) => Math.min(1, Math.max(0, (105 - Math.abs(value)) / 12)));
  const depth = useTransform(proximity, (value) => value * 64);
  const scale = useTransform(proximity, (value) => 0.91 + value * 0.09);
  const raise = useTransform(proximity, (value) => -value * 14);
  // The discrete stack order changes when adjacent cards are at equal depth.
  // Their continuous Z, scale, and lift are equal at that crossing.
  const zIndex = useTransform(angle, (value) => active ? 1000 : 400 - Math.round(Math.abs(value) * 2));
  const highlightTarget = useMotionValue(active ? 1 : 0);
  const highlight = useSpring(highlightTarget, { stiffness: 60, damping: 15 });
  useEffect(() => highlightTarget.set(active ? 1 : 0), [active, highlightTarget]);
  const inverseRotation = useTransform(() => -angle.get() * highlight.get());
  return (
    <motion.div className="absolute top-0" style={{ left: -width / 2, rotate: angle, transformOrigin: origin, opacity, zIndex, pointerEvents: interactive ? 'auto' : 'none', willChange: moving ? 'transform' : 'auto' }}>
      <motion.button
        type="button"
        data-team-slot={slot}
        aria-label={`${member.name}, ${flipped && active ? 'show photo' : 'show details'}`}
        aria-hidden={!interactive}
        tabIndex={interactive ? 0 : -1}
        onClick={(event) => { event.stopPropagation(); if (interactive) onClick(slot); }}
        className="relative block cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d]"
        style={{ width, height: width * 1.25, perspective: 1200, rotate: inverseRotation, z: active ? 0 : depth, scale, y: raise, pointerEvents: interactive ? 'auto' : 'none' }}
        animate={{ translateY: active ? -width * 0.45 : 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)]" style={{ opacity: proximity }} />
        <CardFaces member={member} flipped={active && flipped} />
      </motion.button>
    </motion.div>
  );
});

const RingCard = React.memo(({ index, width, radius, rotation, flipped, onClick }: {
  index: number; width: number; radius: number; rotation: MotionValue<number>;
  flipped: boolean; onClick: (index: number) => void;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const angle = index * (360 / members.length);
  const member = members[index];
  const updateFacing = useCallback(() => {
    const front = Math.abs(normalizedAngle(rotation.get() + angle)) < 78;
    if (!buttonRef.current || !wrapperRef.current) return;
    buttonRef.current.tabIndex = front ? 0 : -1;
    buttonRef.current.style.pointerEvents = front ? 'auto' : 'none';
    wrapperRef.current.setAttribute('aria-hidden', front ? 'false' : 'true');
  }, [angle, rotation]);
  useEffect(updateFacing, [updateFacing]);
  useMotionValueEvent(rotation, 'change', updateFacing);
  return (
    <div ref={wrapperRef} className="absolute top-1/2 left-1/2" style={{ width, height: width * 1.25, marginLeft: -width / 2, marginTop: -width * 0.625, transform: `rotateY(${angle}deg) translateZ(${radius}px)`, transformStyle: 'preserve-3d' }}>
      <button
        ref={buttonRef} type="button" data-team-index={index} aria-label={`${member.name}, ${flipped ? 'show photo' : 'show details'}`}
        onClick={(event) => { event.stopPropagation(); if (event.detail === 0) onClick(index); }}
        className="relative block h-full w-full cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d]"
        style={{ transformStyle: 'preserve-3d', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <CardFaces member={member} flipped={flipped} />
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#f9d02d]/70 bg-[#202121] shadow-[0_20px_45px_rgba(0,0,0,0.45)]" style={{ transform: 'rotateY(180deg) translateZ(3px)', backfaceVisibility: 'hidden', backgroundImage: 'repeating-linear-gradient(45deg,transparent 0,transparent 20px,rgba(249,208,45,.08) 21px,transparent 23px)' }}>
          <div className="absolute inset-[12%] rounded-full border border-[#f9d02d]/25" />
          <div className="absolute inset-[30%] rounded-full border border-[#f9d02d]/20" />
          <span className="absolute inset-0 grid place-items-center text-5xl font-black text-[#f9d02d]/25">UNI</span>
        </div>
      </button>
    </div>
  );
});

const ModeIcon = ({ mode }: { mode: TeamViewMode }) => (
  <span className="relative block h-7 w-7" aria-hidden="true">
    <svg viewBox="0 0 32 32" className={`absolute inset-0 h-full w-full transition-all duration-300 ${mode === 'fan' ? 'scale-100 opacity-100' : 'scale-75 rotate-90 opacity-0'}`} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="16" cy="16" r="13" /><path d="M8 16a8 8 0 0 1 13-6M24 16a8 8 0 0 1-13 6" strokeLinecap="round" /><path d="m20 6 2 4-4 1M12 26l-2-4 4-1" strokeLinejoin="round" />
    </svg>
    <svg viewBox="0 0 32 32" className={`absolute inset-0 h-full w-full transition-all duration-300 ${mode === 'ring' ? 'scale-100 opacity-100' : 'scale-75 -rotate-90 opacity-0'}`} fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="16" cy="16" rx="14" ry="9" /><path d="M8 16a8 8 0 0 1 13-6M24 16a8 8 0 0 1-13 6" strokeLinecap="round" /><path d="m20 6 2 4-4 1M12 26l-2-4 4-1" strokeLinejoin="round" />
    </svg>
  </span>
);

export const OurTeamSection = forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isTeamInView = useInView(containerRef, { once: false, amount: 0.1 });
  const pageVisible = usePageVisibility();
  const reducedMotion = Boolean(useReducedMotion());
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [mode, setMode] = useState<TeamViewMode>('fan');
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef(0);
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
  const drag = useRef<{ id: number; x: number; angle: number; moved: boolean; index: number | null } | null>(null);
  const suppressClickUntil = useRef(0);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const spacing = useTransform(scrollYProgress, [0, 0.15], [10, 40]);
  const fanWidth = Math.min(360, Math.max(210, viewportWidth * 0.58));
  const ringWidth = Math.min(300, Math.max(155, viewportWidth * 0.29));
  const radiusBase = Math.max(520, viewportWidth / 2 + fanWidth / 2 + 30);
  const radius = useTransform(scrollYProgress, [0, 0.5, 1], [radiusBase, radiusBase * 0.78, radiusBase]);
  const transformOrigin = useTransform(radius, (value) => `50% ${value}px`);
  const badgeY = useTransform(radius, (value) => value - 180);
  const ringRadius = Math.min(Math.max(ringWidth / (2 * Math.tan(Math.PI / members.length)) + 16, ringWidth * 0.85), Math.max(215, viewportWidth * 0.42));
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useEffect(() => {
    const observer = new ResizeObserver(() => setViewportWidth((previous) => {
      const next = viewportRef.current?.clientWidth ?? window.innerWidth;
      return previous === next ? previous : next;
    }));
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
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
    if (!isTeamInView || !pageVisible || reducedMotion || switching) return;
    if (mode === 'fan' && activeSlot === null) deckShift.set(deckShift.get() - (0.006 * Math.min(delta, 64)) / spacing.get());
    if (mode === 'ring' && !drag.current && Date.now() >= resumeAt.current) ringRotation.set(ringRotation.get() - 0.012 * Math.min(delta, 64));
  });

  useEffect(() => () => clearTimeout(switchTimer.current), []);
  const switchMode = () => {
    if (switching) return;
    setSwitching(true);
    setActiveSlot(null);
    activeProgress.current = null;
    setFlipped(false);
    setRingFlipped(new Set());
    drag.current = null;
    setMode((current) => current === 'fan' ? 'ring' : 'fan');
    clearTimeout(switchTimer.current);
    switchTimer.current = window.setTimeout(() => setSwitching(false), reducedMotion ? 180 : 800);
  };
  const selectFan = (slot: number) => {
    if (switching) return;
    if (activeSlot === slot) { setFlipped((value) => !value); return; }
    setActiveSlot(slot);
    activeProgress.current = scrollYProgress.get();
    setFlipped(false);
    animate(deckShift, -slot, { duration: reducedMotion ? 0.15 : 0.8, ease: 'easeInOut' });
  };
  const selectRing = (index: number) => {
    if (switching || Date.now() < suppressClickUntil.current) return;
    setRingFlipped((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'ring' || switching || event.button !== 0) return;
    const target = (event.target as Element).closest<HTMLButtonElement>('[data-team-index]');
    drag.current = { id: event.pointerId, x: event.clientX, angle: ringRotation.get(), moved: false, index: target && target.tabIndex === 0 ? Number(target.dataset.teamIndex) : null };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const distance = event.clientX - current.x;
    if (!current.moved && Math.abs(distance) < 7) return;
    current.moved = true;
    ringRotation.set(current.angle + distance * 0.35);
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (current.moved) {
      suppressClickUntil.current = Date.now() + 300;
      resumeAt.current = Date.now() + 2000;
    } else if (event.type === 'pointerup' && current.index !== null) {
      selectRing(current.index);
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const fanSlots = useMemo(() => Array.from({ length: overscan * 2 + 1 }, (_, index) => centerSlot - overscan + index), [centerSlot, overscan]);
  const transition = { duration: reducedMotion ? 0.15 : 0.75, ease: 'easeInOut' as const };

  return (
    <div ref={setRefs} id="our-team" className="relative z-20 flex min-h-[300vh] w-full flex-col items-center overflow-hidden pt-[clamp(120px,18vh,180px)] pb-40">
      <div className="relative z-50 mb-20 flex w-full flex-col items-center px-4 text-center sm:px-8">
        <div className="flex max-w-full items-center justify-center gap-3 sm:gap-5">
          <h2 className="min-w-0 text-[clamp(2.2rem,6vw,6.875rem)] leading-none font-black tracking-tight text-white uppercase drop-shadow-2xl">MEET OUR TEAM</h2>
          <button type="button" onClick={switchMode} aria-label={mode === 'fan' ? 'Switch to ring view' : 'Switch to fan view'} aria-pressed={mode === 'ring'} title={mode === 'fan' ? 'Ring view' : 'Fan view'} className="relative z-50 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#f9d02d] bg-[#202121] text-[#f9d02d] shadow-lg transition-colors hover:bg-[#f9d02d] hover:text-[#202121] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d]"><ModeIcon mode={mode} /></button>
        </div>
        <motion.p animate={{ opacity: mode === 'fan' && activeSlot !== null ? 0 : 1 }} className="mt-4 text-base font-medium tracking-wide text-white/80 sm:text-xl lg:text-2xl">{mode === 'fan' ? 'Click for preview, click again for details!' : 'Drag to rotate • Click a card for details'}</motion.p>
      </div>
      <div ref={viewportRef} className="relative z-40 h-[min(750px,95vh)] w-full max-w-full overflow-visible" style={{ perspective: mode === 'ring' ? 1100 : undefined }}>
        <AnimatePresence initial={false} mode="sync">
          {mode === 'fan' ? (
            <motion.div key="fan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} className="absolute inset-0 flex justify-center" style={{ pointerEvents: switching ? 'none' : 'auto' }} onClick={() => { if (activeSlot !== null) { setActiveSlot(null); activeProgress.current = null; setFlipped(false); } }}>
              <div className="relative h-0 w-0" style={{ transformStyle: 'preserve-3d', perspective: 1600 }}>
                <motion.div initial={{ opacity: 0, scale: 0.3 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.8, ease: 'backOut' }} className="absolute flex h-[360px] w-[360px] items-center justify-center bg-[#202121] shadow-[0_25px_60px_rgba(0,0,0,0.7)]" style={{ left: -180, y: badgeY, zIndex: 510, clipPath: 'polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)' }}>
                  <motion.div animate={{ rotate: reducedMotion ? 0 : 360 }} transition={{ repeat: Infinity, duration: 25, ease: 'linear' }} className="pointer-events-none absolute inset-0 flex items-center justify-center"><svg className="h-[92%] w-[92%]" viewBox="0 0 360 360"><defs><path id="centerCirclePath" d="M 180, 180 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0" /></defs><text className="fill-white text-[21px] font-extrabold tracking-[0.14em]"><textPath href="#centerCirclePath" startOffset="0%" textLength="816" lengthAdjust="spacing">{'•\u00A0Creative Inside\u00A0•\u00A0Impact Outside\u00A0'}</textPath></text></svg></motion.div>
                  <motion.div animate={{ rotate: reducedMotion ? 0 : -360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="relative z-10 flex h-32 w-32 items-center justify-center"><img src={logoDarkTheme} alt="Uni-Inside Logo" className="h-full w-full object-contain drop-shadow-lg" /></motion.div>
                </motion.div>
                {fanSlots.map((slot) => <FanCard key={slot} slot={slot} active={activeSlot === slot} interactive={!switching && Math.abs(slot - centerSlot) <= 4} flipped={flipped} deckShift={deckShift} spacing={spacing} origin={transformOrigin} width={fanWidth} moving={isTeamInView && pageVisible && !reducedMotion && activeSlot === null} onClick={selectFan} />)}
              </div>
            </motion.div>
          ) : (
            <motion.div key="ring" initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }} transition={transition} className="absolute inset-0 flex items-start justify-center pt-16 pointer-events-none" style={{ pointerEvents: switching ? 'none' : 'auto', touchAction: 'pan-y', cursor: 'grab' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <motion.div data-team-ring className="relative h-[min(300px,45vh)] w-full" style={{ rotateY: ringRotation, rotateX: -8, transformStyle: 'preserve-3d', transformOrigin: 'center center', willChange: isTeamInView && pageVisible && !reducedMotion ? 'transform' : 'auto' }}>
                {members.map((_, index) => <RingCard key={index} index={index} width={ringWidth} radius={ringRadius} rotation={ringRotation} flipped={ringFlipped.has(index)} onClick={selectRing} />)}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {mode === 'fan' && activeSlot !== null && <div className="fixed inset-0 z-30" onClick={() => { setActiveSlot(null); activeProgress.current = null; setFlipped(false); }} />}
    </div>
  );
});
OurTeamSection.displayName = 'OurTeamSection';
