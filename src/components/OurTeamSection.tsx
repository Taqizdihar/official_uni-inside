import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useAnimationFrame, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
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
type TeamViewMode = 'fan' | 'ring';

const socials = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/', Icon: RiLinkedinLine },
  { name: 'Instagram', url: 'https://www.instagram.com/', Icon: RiInstagramLine },
  { name: 'X', url: 'https://x.com/', Icon: RiTwitterXLine },
  { name: 'GitHub', url: 'https://github.com/', Icon: RiGithubLine },
];

const CardFaces = React.memo(({ member, flipped, interactive, prominent = false, onClick }: { member: typeof members[number]; flipped: boolean; interactive: boolean; prominent?: boolean; onClick: () => void }) => {
  const reducedMotion = Boolean(useReducedMotion());
  return <motion.div
    className="relative h-full w-full"
    animate={{ rotateY: flipped ? 180 : 0 }}
    transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeInOut' }}
    style={{ transformStyle: 'preserve-3d' }}
  >
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border-[4px] border-white bg-[#202121] shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ backfaceVisibility: 'hidden' }}>
      <img src={member.image} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
      <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} aria-label={`${member.name}, show details`} tabIndex={interactive && !flipped ? 0 : -1} className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-[-5px] focus-visible:outline-[#f9d02d]" style={{ pointerEvents: interactive && !flipped ? 'auto' : 'none' }} />
    </div>
    <div className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-2xl border-[4px] border-[#f9d02d] bg-[#202121] p-[5%] text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]" style={{ transform: 'rotateY(180deg) translateZ(1px)', backfaceVisibility: 'hidden' }}>
      <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} aria-label={`${member.name}, show photo`} tabIndex={interactive && flipped ? 0 : -1} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-[-5px] focus-visible:outline-[#f9d02d]" style={{ pointerEvents: interactive && flipped ? 'auto' : 'none' }} />
      <h3 className={`pointer-events-none relative mt-2 mb-1 font-black uppercase tracking-wide text-white ${prominent ? 'text-xl' : 'text-[clamp(1.05rem,1.5vw,1.5rem)]'}`}>{member.name}</h3>
      <p className={`pointer-events-none relative mb-3 font-bold uppercase tracking-wider text-[#f9d02d] ${prominent ? 'text-[11px]' : 'text-[clamp(0.55rem,0.7vw,0.7rem)]'}`}>{member.role}</p>
      <p className={`pointer-events-none relative mb-auto leading-snug font-medium text-white/85 ${prominent ? 'text-[13px]' : 'text-[clamp(0.62rem,0.8vw,0.85rem)]'}`}>{member.description}</p>
      <div className="relative z-10 mb-2 flex gap-3 text-white/75">
        {socials.map(({ name, url, Icon }) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on ${name}`} tabIndex={interactive && flipped ? 0 : -1} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} className="rounded focus-visible:outline-2 focus-visible:outline-[#f9d02d] hover:text-[#f9d02d]" style={{ pointerEvents: interactive && flipped ? 'auto' : 'none' }}><Icon className={prominent ? 'h-5 w-5' : 'h-[clamp(14px,1.3vw,20px)] w-[clamp(14px,1.3vw,20px)]'} /></a>)}
      </div>
    </div>
  </motion.div>;
});

const FanCard = React.memo(({ slot, active, interactive, flipped, deckShift, spacing, visibleAngle, origin, moving, onClick }: {
  slot: number; active: boolean; interactive: boolean; flipped: boolean;
  deckShift: MotionValue<number>; spacing: MotionValue<number>; visibleAngle: MotionValue<number>; origin: MotionValue<string>;
  moving: boolean; onClick: (slot: number) => void;
}) => {
  const member = members[memberForSlot(slot)];
  // Repeat the member sequence beyond both ends of the fan, while keeping
  // each card's angle continuous as it enters and leaves the circle.
  const angle = useTransform(() => (slot + deckShift.get()) * spacing.get());
  const opacity = useTransform(() => Math.min(1, Math.max(0, (visibleAngle.get() - Math.abs(angle.get())) / 12)));
  const proximity = useTransform(angle, (value) => Math.max(0, 1 - Math.abs(value) / 65));
  const zIndex = useTransform(angle, (value) => active ? 1000 : 400 - Math.round(Math.abs(value) * 2));
  const highlightTarget = useMotionValue(active ? 1 : 0);
  const highlight = useSpring(highlightTarget, { stiffness: 60, damping: 15 });
  useEffect(() => highlightTarget.set(active ? 1 : 0), [active, highlightTarget]);
  const inverseRotation = useTransform(() => -angle.get() * highlight.get());
  return (
    <motion.div className="absolute top-0" style={{ left: -180, rotate: angle, transformOrigin: origin, opacity, zIndex, pointerEvents: interactive ? 'auto' : 'none', willChange: moving ? 'transform' : 'auto' }}>
      <motion.div
        className="relative block rounded-2xl"
        style={{ width: 360, height: 450, perspective: 1200, rotate: inverseRotation, pointerEvents: interactive ? 'auto' : 'none' }}
        animate={{ translateY: active ? -250 : 0, scale: active ? 0.99 : 1 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)]" style={{ opacity: proximity }} />
        <CardFaces member={member} flipped={active && flipped} interactive={interactive} prominent={active} onClick={() => onClick(slot)} />
      </motion.div>
    </motion.div>
  );
});

const RingCard = React.memo(({ index, width, radius, depth, rotation, flipped, onClick }: {
  index: number; width: number; radius: number; depth: number; rotation: MotionValue<number>;
  flipped: boolean; onClick: (index: number) => void;
}) => {
  const baseAngle = index * (360 / members.length);
  // A smooth angular easing keeps front neighbors close while retaining the
  // full rear arc; every card still lies on the same oval ring.
  const angle = baseAngle - (width < 200 ? 23 : 24) * Math.sin(baseAngle * Math.PI / 180);
  const radians = angle * Math.PI / 180;
  const stackOrder = useTransform(rotation, (value) => Math.round(500 + 500 * Math.cos((angle + value) * Math.PI / 180)));
  const member = members[index];
  const facingLimit = width < 160 ? 20 : 78;
  const [frontFacing, setFrontFacing] = useState(() => Math.abs(normalizedAngle(rotation.get() + angle)) < facingLimit);
  const updateFacing = useCallback(() => {
    const front = Math.abs(normalizedAngle(rotation.get() + angle)) < facingLimit;
    setFrontFacing((previous) => previous === front ? previous : front);
  }, [angle, facingLimit, rotation]);
  useEffect(updateFacing, [updateFacing]);
  useMotionValueEvent(rotation, 'change', updateFacing);
  return (
    <motion.div data-team-index={index} aria-hidden={!frontFacing} className="absolute top-1/2 left-1/2" style={{ width, height: width * 1.25, marginLeft: -width / 2, marginTop: -width * 0.625, transform: `translate3d(${Math.sin(radians) * radius}px, 0, ${Math.cos(radians) * depth + (flipped ? 165 : 0)}px) rotateY(${angle}deg)`, transition: 'transform 350ms ease', transformStyle: 'preserve-3d', zIndex: stackOrder, pointerEvents: frontFacing ? 'auto' : 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
        <CardFaces member={member} flipped={flipped} interactive={frontFacing} onClick={() => onClick(index)} />
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#f9d02d]/70 bg-[#202121] shadow-[0_20px_45px_rgba(0,0,0,0.45)]" style={{ transform: 'rotateY(180deg) translateZ(3px)', backfaceVisibility: 'hidden', backgroundImage: 'repeating-linear-gradient(45deg,transparent 0,transparent 20px,rgba(249,208,45,.08) 21px,transparent 23px)' }}>
          <div className="absolute inset-[12%] rounded-full border border-[#f9d02d]/25" />
          <div className="absolute inset-[30%] rounded-full border border-[#f9d02d]/20" />
          <span className="absolute inset-0 grid place-items-center text-5xl font-black text-[#f9d02d]/25">UNI</span>
        </div>
      </div>
    </motion.div>
  );
});

const ModeIcon = ({ mode }: { mode: TeamViewMode }) => (
  <span className="relative block h-[88px] w-[88px]" aria-hidden="true">
    <img src={normalModeIcon} alt="" className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${mode === 'fan' ? 'opacity-100' : 'opacity-0'}`} />
    <img src={ringModeIcon} alt="" className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none ${mode === 'ring' ? 'opacity-100' : 'opacity-0'}`} />
  </span>
);

export const OurTeamSection = forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const ringStageRef = useRef<HTMLDivElement>(null);
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
  const [overscan, setOverscan] = useState(15);
  const overscanRef = useRef(15);
  const activeProgress = useRef<number | null>(null);
  const deckShift = useMotionValue(0);
  const ringRotation = useMotionValue(0);
  const resumeAt = useRef(0);
  const inertiaVelocity = useRef(0);
  const drag = useRef<{ id: number; x: number; lastX: number; lastTime: number; angle: number; velocity: number; moved: boolean; index: number | null } | null>(null);
  const suppressClickUntil = useRef(0);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const spacing = useTransform(scrollYProgress, [0, 0.15], [10, 40]);
  const visibleAngle = useTransform(spacing, (value) => 105 + (value - 10) * (80 / 30));
  const ringWidth = Math.min(320, Math.max(150, viewportWidth * 0.167));
  const radius = useTransform(scrollYProgress, [0, 0.5, 1], [1000, 700, 1000]);
  const transformOrigin = useTransform(radius, (value) => `50% ${value}px`);
  const badgeY = useTransform(radius, (value) => value - 180);
  const ringRadius = Math.min(viewportWidth * 0.425, (viewportWidth - ringWidth * 0.45) / 2 - (viewportWidth < 600 ? 24 : 8));
  const ringDepth = viewportWidth * 0.26;
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
  useMotionValueEvent(visibleAngle, 'change', () => {
    const next = Math.ceil(visibleAngle.get() / Math.max(spacing.get(), 1)) + 4;
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
    if (mode === 'ring' && !drag.current) {
      const step = Math.min(delta, 64);
      if (Math.abs(inertiaVelocity.current) > 0.003) {
        ringRotation.set(ringRotation.get() + inertiaVelocity.current * step);
        inertiaVelocity.current *= Math.exp(-step / 720);
        if (Math.abs(inertiaVelocity.current) <= 0.003) {
          inertiaVelocity.current = 0;
          resumeAt.current = Date.now() + 2000;
        }
      } else if (Date.now() >= resumeAt.current) {
        const blend = Math.min(1, (Date.now() - resumeAt.current) / 850);
        ringRotation.set(ringRotation.get() - 0.012 * blend * step);
      }
    }
  });

  useEffect(() => () => clearTimeout(switchTimer.current), []);
  const releaseRingPointer = useCallback(() => {
    const pointer = drag.current;
    if (pointer && ringStageRef.current?.hasPointerCapture(pointer.id)) ringStageRef.current.releasePointerCapture(pointer.id);
    drag.current = null;
  }, []);
  useEffect(() => {
    if (!pageVisible) {
      releaseRingPointer();
      inertiaVelocity.current = 0;
      resumeAt.current = Date.now() + 2000;
    }
  }, [pageVisible, releaseRingPointer]);
  useEffect(() => () => {
    releaseRingPointer();
    inertiaVelocity.current = 0;
  }, [releaseRingPointer]);
  const switchMode = () => {
    if (switching) return;
    setSwitching(true);
    setActiveSlot(null);
    activeProgress.current = null;
    setFlipped(false);
    setRingFlipped(new Set());
    releaseRingPointer();
    inertiaVelocity.current = 0;
    resumeAt.current = Date.now() + 2000;
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
    if ((event.target as Element).closest('a')) return;
    const target = (event.target as Element).closest<HTMLElement>('[data-team-index]');
    inertiaVelocity.current = 0;
    resumeAt.current = Infinity;
    drag.current = { id: event.pointerId, x: event.clientX, lastX: event.clientX, lastTime: event.timeStamp, angle: ringRotation.get(), velocity: 0, moved: false, index: target && target.getAttribute('aria-hidden') === 'false' ? Number(target.dataset.teamIndex) : null };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const distance = event.clientX - current.x;
    if (!current.moved && Math.abs(distance) < 7) return;
    current.moved = true;
    const elapsed = Math.max(1, event.timeStamp - current.lastTime);
    const sample = Math.max(-900, Math.min(900, (event.clientX - current.lastX) / elapsed * 1000));
    current.velocity = current.velocity * 0.55 + sample * 0.45;
    current.lastX = event.clientX;
    current.lastTime = event.timeStamp;
    ringRotation.set(current.angle + distance * 0.38);
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (current.moved) {
      suppressClickUntil.current = Date.now() + 80;
      const recentVelocity = current.velocity * Math.exp(-Math.max(0, event.timeStamp - current.lastTime) / 120);
      inertiaVelocity.current = event.type === 'pointerup' && !reducedMotion ? recentVelocity * 0.38 / 1000 * 0.9 : 0;
      if (Math.abs(inertiaVelocity.current) <= 0.003) resumeAt.current = Date.now() + 2000;
    } else if (event.type === 'pointerup' && current.index !== null) {
      selectRing(current.index);
      suppressClickUntil.current = Date.now() + 80;
      resumeAt.current = Date.now() + 2000;
    }
    releaseRingPointer();
  };
  const fanSlots = useMemo(() => Array.from({ length: overscan * 2 + 1 }, (_, index) => centerSlot - overscan + index), [centerSlot, overscan]);
  const transition = { duration: reducedMotion ? 0.15 : 0.75, ease: 'easeInOut' as const };

  return (
    <div ref={setRefs} id="our-team" className="relative z-20 flex min-h-[300vh] w-full flex-col items-center overflow-x-clip pt-[clamp(120px,18vh,180px)] pb-40">
      <div className="relative z-30 mb-20 flex w-full flex-col items-center px-4 text-center sm:px-8">
        <div className="flex max-w-full items-center justify-center gap-3 sm:gap-5">
          <h2 className="min-w-0 text-[clamp(2.2rem,6vw,6.875rem)] leading-none font-black tracking-tight text-white uppercase drop-shadow-2xl">MEET OUR TEAM</h2>
          <button type="button" onClick={switchMode} disabled={switching} aria-label={mode === 'fan' ? 'Switch to ring view' : 'Switch to fan view'} aria-pressed={mode === 'ring'} title={mode === 'fan' ? 'Ring view' : 'Fan view'} className="relative z-50 grid h-24 w-24 shrink-0 place-items-center rounded-full focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d]"><ModeIcon mode={mode} /></button>
        </div>
        <motion.p animate={{ opacity: mode === 'fan' && activeSlot !== null ? 0 : 1 }} className="mt-4 text-base font-medium tracking-wide text-white/80 sm:text-xl lg:text-2xl">{mode === 'fan' ? 'Click for preview, click again for details!' : 'Drag to rotate • Click a card for details'}</motion.p>
      </div>
      <div ref={viewportRef} className={`z-40 w-full max-w-full overflow-visible ${mode === 'fan' ? 'relative -mt-32 h-[600px]' : 'sticky top-[min(8vh,72px)] h-[min(750px,95vh)]'}`} style={{ perspective: mode === 'ring' ? Math.max(850, viewportWidth * 0.94) : undefined }}>
        <AnimatePresence initial={false} mode="sync">
          {mode === 'fan' ? (
            <motion.div key="fan" initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }} transition={transition} className="absolute inset-0 flex justify-center" style={{ pointerEvents: switching ? 'none' : 'auto' }} onClick={() => { if (activeSlot !== null) { setActiveSlot(null); activeProgress.current = null; setFlipped(false); } }}>
              <motion.div className="relative h-0 w-0" style={{ transformOrigin, scale: 0.85, transformStyle: 'preserve-3d', perspective: 1600 }}>
                <motion.div initial={{ opacity: 0, scale: 0.3 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.3 }} transition={{ duration: 0.8, ease: 'backOut' }} className="absolute flex h-[360px] w-[360px] items-center justify-center bg-[#202121] shadow-[0_25px_60px_rgba(0,0,0,0.7)]" style={{ left: -180, y: badgeY, zIndex: 510, clipPath: 'polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)' }}>
                  <motion.div animate={{ rotate: reducedMotion ? 0 : 360 }} transition={{ repeat: Infinity, duration: 25, ease: 'linear' }} className="pointer-events-none absolute inset-0 flex items-center justify-center"><svg className="h-[92%] w-[92%]" viewBox="0 0 360 360"><defs><path id="centerCirclePath" d="M 180, 180 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0" /></defs><text className="fill-white text-[21px] font-extrabold tracking-[0.14em]"><textPath href="#centerCirclePath" startOffset="0%" textLength="816" lengthAdjust="spacing">{'•\u00A0Creative Inside\u00A0•\u00A0Impact Outside\u00A0'}</textPath></text></svg></motion.div>
                  <motion.div animate={{ rotate: reducedMotion ? 0 : -360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="relative z-10 flex h-32 w-32 items-center justify-center"><img src={logoDarkTheme} alt="Uni-Inside Logo" className="h-full w-full object-contain drop-shadow-lg" /></motion.div>
                </motion.div>
                {fanSlots.map((slot) => <FanCard key={slot} slot={slot} active={activeSlot === slot} interactive={!switching && Math.abs(slot - centerSlot) <= overscan - 5} flipped={flipped} deckShift={deckShift} spacing={spacing} visibleAngle={visibleAngle} origin={transformOrigin} moving={isTeamInView && pageVisible && !reducedMotion && activeSlot === null} onClick={selectFan} />)}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div ref={ringStageRef} key="ring" initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.9 }} transition={transition} className="absolute inset-0 flex items-start justify-center pt-20 md:pt-32 pointer-events-none" style={{ pointerEvents: switching ? 'none' : 'auto', touchAction: 'pan-y', cursor: 'grab', transformStyle: 'preserve-3d' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <motion.div data-team-ring className="relative h-[min(300px,45vh)] w-full" style={{ rotateY: ringRotation, rotateX: -8, transformStyle: 'preserve-3d', transformOrigin: 'center center', willChange: isTeamInView && pageVisible && !reducedMotion ? 'transform' : 'auto' }}>
                {members.map((_, index) => <RingCard key={index} index={index} width={ringWidth} radius={ringRadius} depth={ringDepth} rotation={ringRotation} flipped={ringFlipped.has(index)} onClick={selectRing} />)}
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
