import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import type { MotionValue } from 'motion/react';
import {
  RiGithubLine,
  RiInstagramLine,
  RiLinkedinLine,
  RiTwitterXLine,
} from 'react-icons/ri';
import type { IconType } from 'react-icons';
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

type TeamMember = {
  name: string;
  image: string;
  role: string;
  description: string;
  socials: {
    linkedin: string;
    instagram: string;
    x: string;
    github: string;
  };
};

const placeholderSocials = {
  linkedin: 'https://www.linkedin.com/',
  instagram: 'https://www.instagram.com/',
  x: 'https://x.com/',
  github: 'https://github.com/',
};

const members: TeamMember[] = [
  {
    name: 'April', image: member1, role: 'Chief Executive Officer',
    description: 'Leads the overall direction of Uni-Inside Studio and coordinates the team in turning creative ideas into focused, collaborative work.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Dian', image: member2, role: 'Chief Operating Officer',
    description: 'Oversees day-to-day operations, coordinates project workflows, and helps collaboration across Uni-Inside Studio and Uni-Inside Craft run effectively.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Taqi', image: member3, role: 'Chief Technology Officer',
    description: 'Leads technology development, digital experiences, and technical systems that support Uni-Inside Studio and Uni-Inside Craft.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Amadea', image: member4, role: 'Staff of Specialty',
    description: 'Supports Uni-Inside Craft operations, including product packaging and occasional hand-painting of printed models.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Nadine', image: member5, role: 'Staff of Specialty',
    description: 'Developed Uni-Smiles, Uni-Inside’s photobooth application, and contributes to the studio’s technology-driven creative experiences.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Naura', image: member6, role: 'Staff of Specialty',
    description: 'Creates social media content for Uni-Inside Studio and helps translate the studio’s work into engaging digital stories.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Anggi', image: member7, role: 'Staff of Specialty',
    description: 'Specializes in hand-painting printed models with careful detail and finishing.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Amany', image: member8, role: 'Staff of Specialty',
    description: 'Creates social media content for Uni-Inside Studio, with a primary focus on posts, feeds, and visual presentation.',
    socials: { ...placeholderSocials },
  },
  {
    name: 'Ropaldo', image: member9, role: 'Souvenir & 3D Engineer',
    description: 'Designs custom 3D models and configures models for reliable 3D-printing production.',
    socials: { ...placeholderSocials },
  },
];

type TeamViewMode = 'fan' | 'ring';
type SocialKey = keyof TeamMember['socials'];
type SocialItem = { key: SocialKey; label: string; Icon: IconType };
const socialItems: SocialItem[] = [
  { key: 'linkedin', label: 'LinkedIn', Icon: RiLinkedinLine },
  { key: 'instagram', label: 'Instagram', Icon: RiInstagramLine },
  { key: 'x', label: 'X', Icon: RiTwitterXLine },
  { key: 'github', label: 'GitHub', Icon: RiGithubLine },
];

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const normalizedAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;

type LayoutMetrics = {
  stageHeight: number;
  ringWidth: number;
  ringHeight: number;
  ringRadius: number;
  normalWidth: number;
  normalHeight: number;
  normalRadius: number;
  fanRadius: number;
  fanVerticalRadius: number;
  fanCenterY: number;
  badgeSize: number;
};

const getLayoutMetrics = (width: number, viewportHeight: number): LayoutMetrics => {
  const stageHeight = Math.min(780, Math.max(380, viewportHeight * 0.74));
  const safeWidth = Math.max(220, width - 32);
  const halfAngleChord = 2 * Math.sin(Math.PI / members.length);
  const desiredRingGap = 16;
  const projectedWidthScale = width < 500 ? 1.04 : width < 1100 ? 1.12 : 1.09;
  const safeHalfWidth = Math.max(64, width / 2 - 12);
  const maximumRingRadius = (safeHalfWidth - 12) / projectedWidthScale;
  const maximumRingWidth = maximumRingRadius * halfAngleChord - desiredRingGap;
  const ringWidth = Math.min(280, width * 0.3, stageHeight * 0.34, maximumRingWidth);
  const ringRadiusMinimum = (ringWidth + desiredRingGap) / halfAngleChord;
  const preferredRingRadius = width >= 1100 ? width * 0.451 : width * 0.445;
  const ringRadius = Math.min(maximumRingRadius, Math.max(ringRadiusMinimum, preferredRingRadius));
  const ringHeight = Math.max(ringWidth * 1.32, width < 420 ? 120 : 150);

  const circleSafeDiameter = Math.max(200, Math.min(safeWidth, stageHeight - 32));
  const desiredNormalGap = 12;
  const desiredBadgeGap = 12;
  const badgeSize = Math.min(300, stageHeight * 0.42, width * 0.44);
  const normalWidthAtStandardAspect = (
    circleSafeDiameter / 2 - desiredNormalGap / halfAngleChord
  ) / (1.32 / halfAngleChord + 0.5);
  const maximumNormalCardWidthForBadge = Math.max(
    0,
    circleSafeDiameter / 2 - badgeSize / 2 - desiredBadgeGap,
  );
  const normalWidth = Math.min(
    ringWidth,
    normalWidthAtStandardAspect,
    maximumNormalCardWidthForBadge,
  );
  const normalHeight = normalWidth * 1.32;
  const normalRadius = Math.max(
    (normalHeight + desiredNormalGap) / halfAngleChord,
    badgeSize / 2 + desiredBadgeGap + normalWidth / 2,
  );
  const fanRadius = Math.max(72, width / 2 - Math.max(ringHeight, normalHeight) / 2 - 14);
  const fanVerticalRadius = Math.max(stageHeight * 0.5, fanRadius * 0.34);
  const fanCenterY = stageHeight * 0.045 + fanVerticalRadius;

  return {
    stageHeight, ringWidth, ringHeight, ringRadius, normalWidth, normalHeight,
    normalRadius, fanRadius, fanVerticalRadius, fanCenterY,
    badgeSize,
  };
};

const CardFaces = React.memo(({
  member,
  flipped,
  mode,
  normalWidth,
  ringWidth,
  reducedMotion,
  onFlip,
  setSocialRef,
  frontButtonRef,
  backButtonRef,
  frontFaceRef,
  backFaceRef,
}: {
  member: TeamMember;
  flipped: boolean;
  mode: TeamViewMode;
  normalWidth: number;
  ringWidth: number;
  reducedMotion: boolean;
  onFlip: () => void;
  setSocialRef: (index: number, node: HTMLAnchorElement | null) => void;
  frontButtonRef: React.RefObject<HTMLButtonElement | null>;
  backButtonRef: React.RefObject<HTMLButtonElement | null>;
  frontFaceRef: React.RefObject<HTMLDivElement | null>;
  backFaceRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const contentWidth = Math.max(normalWidth, ringWidth * 0.78);
  const tinyCard = normalWidth < 70;
  const nameSize = clamp(contentWidth * 0.13, 8, 25);
  const roleSize = clamp(contentWidth * 0.065, 5.5, 11);
  const descriptionSize = clamp(contentWidth * 0.062, 5, 13);
  const iconSize = clamp(contentWidth * 0.11, 10, 20);
  const actionDuration = reducedMotion ? 0.18 : 0.65;

  return (
    <motion.div
      className="relative h-full w-full"
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: actionDuration, ease: 'easeInOut' }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        ref={frontFaceRef}
        className="absolute inset-0 overflow-hidden rounded-2xl border-[3px] border-white bg-[#202121] shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
      >
        <img src={member.image} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
        <button
          ref={frontButtonRef}
          type="button"
          aria-label={`${member.name}, ${mode === 'ring' ? 'show details' : 'select member'}`}
          onClick={(event) => { event.stopPropagation(); onFlip(); }}
          className="absolute inset-0 rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-[-5px] focus-visible:outline-[#f9d02d]"
        />
      </div>
      <div
        ref={backFaceRef}
        className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-[3px] border-[#f9d02d] bg-[#202121] text-center shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        style={{ transform: 'rotateY(180deg) translateZ(1px)', backfaceVisibility: 'hidden', padding: tinyCard ? 4 : '6%' }}
      >
        <button
          ref={backButtonRef}
          type="button"
          aria-label={`${member.name}, show photo`}
          onClick={(event) => { event.stopPropagation(); onFlip(); }}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-4 focus-visible:outline-offset-[-5px] focus-visible:outline-[#f9d02d]"
        />
        <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col items-center">
          <h3 className="m-0 w-full font-black uppercase leading-tight tracking-wide text-white" style={{ fontSize: nameSize }}>{member.name}</h3>
          <p className="mb-1 mt-0 w-full font-bold uppercase leading-tight tracking-[0.08em] text-[#f9d02d]" style={{ fontSize: roleSize }}>{member.role}</p>
          <p className="mb-1 mt-0 min-h-0 w-full flex-1 overflow-hidden font-medium leading-[1.15] text-white/85" style={{ fontSize: descriptionSize }}>{member.description}</p>
          <div
            className="pointer-events-auto relative z-20 grid w-full shrink-0 place-items-center"
            style={{ gridTemplateColumns: normalWidth < 82 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: tinyCard ? 1 : 3 }}
          >
            {socialItems.map(({ key, label, Icon }, index) => (
              <a
                key={key}
                ref={(node) => setSocialRef(index, node)}
                href={member.socials[key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} on ${label}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                className="grid min-h-[18px] min-w-[18px] place-items-center rounded text-white/75 transition-colors hover:bg-[#f9d02d]/20 hover:text-[#f9d02d] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f9d02d]"
              >
                <Icon aria-hidden="true" style={{ width: iconSize, height: iconSize }} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border-4 border-[#f9d02d]/70 bg-[#202121] shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
        style={{ transform: 'rotateY(180deg) translateZ(3px)', backfaceVisibility: 'hidden', backgroundImage: 'repeating-linear-gradient(45deg,transparent 0,transparent 20px,rgba(249,208,45,.08) 21px,transparent 23px)' }}
      >
        <div className="absolute inset-[12%] rounded-full border border-[#f9d02d]/25" />
        <div className="absolute inset-[30%] rounded-full border border-[#f9d02d]/20" />
        <span className="absolute inset-0 grid place-items-center text-5xl font-black text-[#f9d02d]/25">UNI</span>
      </div>
    </motion.div>
  );
});

const TeamCard = React.memo(({
  index,
  member,
  metrics,
  sectionProgress,
  normalRotation,
  ringRotation,
  modeMorph,
  currentMode,
  morphing,
  flipped,
  selected,
  reducedMotion,
  onActivate,
}: {
  index: number;
  member: TeamMember;
  metrics: LayoutMetrics;
  sectionProgress: MotionValue<number>;
  normalRotation: MotionValue<number>;
  ringRotation: MotionValue<number>;
  modeMorph: MotionValue<number>;
  currentMode: TeamViewMode;
  morphing: boolean;
  flipped: boolean;
  selected: boolean;
  reducedMotion: boolean;
  onActivate: (index: number) => void;
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);
  const frontButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const socialRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const highlightTarget = useMotionValue(selected ? 1 : 0);
  const highlight = useSpring(highlightTarget, { stiffness: 80, damping: 18 });
  const detailTarget = useMotionValue(flipped ? 1 : 0);
  const detailProgress = useSpring(detailTarget, { stiffness: 100, damping: 20 });
  const setSocialRef = useCallback((socialIndex: number, node: HTMLAnchorElement | null) => {
    socialRefs.current[socialIndex] = node;
  }, []);

  useEffect(() => { highlightTarget.set(selected ? 1 : 0); }, [highlightTarget, selected]);
  useEffect(() => { detailTarget.set(flipped ? 1 : 0); }, [detailTarget, flipped]);

  const width = useTransform(() => mix(metrics.normalWidth, metrics.ringWidth, clamp(modeMorph.get(), 0, 1)));
  const height = useTransform(() => {
    const morph = clamp(modeMorph.get(), 0, 1);
    const detailExpansion = mix(Math.max(88, 192 - metrics.normalHeight), 88, morph);
    return mix(metrics.normalHeight, metrics.ringHeight, morph) + detailProgress.get() * detailExpansion;
  });
  const zIndex = useTransform(() => {
    const morph = clamp(modeMorph.get(), 0, 1);
    const scroll = clamp(sectionProgress.get(), 0, 1);
    const circle = clamp((scroll - 0.1) / 0.45, 0, 1);
    const easedCircle = circle * circle * (3 - 2 * circle);
    const normalAngle = radians(index * (360 / members.length) + normalRotation.get());
    const ringAngle = radians(index * (360 / members.length) + ringRotation.get());
    const normalOrder = 100 + index + Math.round(Math.cos(normalAngle) * 50 * (1 - easedCircle));
    const ringOrder = 100 + index + Math.round(Math.cos(ringAngle) * 80);
    return Math.round(mix(normalOrder, ringOrder, morph));
  });
  const transform = useTransform(() => {
    const morph = clamp(modeMorph.get(), 0, 1);
    const scroll = clamp(sectionProgress.get(), 0, 1);
    const circleProgress = clamp((scroll - 0.1) / 0.45, 0, 1);
    const smoothCircle = circleProgress * circleProgress * (3 - 2 * circleProgress);
    const normalAngle = index * (360 / members.length) + normalRotation.get();
    const normalRadians = radians(normalAngle);
    const normalRadius = mix(metrics.fanRadius, metrics.normalRadius, smoothCircle);
    const verticalRadius = mix(metrics.fanVerticalRadius, metrics.normalRadius, smoothCircle);
    const centerY = mix(metrics.fanCenterY, metrics.stageHeight / 2, smoothCircle);
    const normalX = Math.sin(normalRadians) * normalRadius;
    const normalY = centerY - Math.cos(normalRadians) * verticalRadius - metrics.stageHeight / 2;
    const fanDepth = Math.cos(normalRadians) * 58 * (1 - smoothCircle);
    const normalZ = fanDepth + highlight.get() * 44;
    const normalScale = mix(0.92 + Math.max(0, Math.cos(normalRadians)) * 0.08, 1, smoothCircle) + highlight.get() * 0.055;

    const ringAngle = index * (360 / members.length) + ringRotation.get();
    const ringRadians = radians(ringAngle);
    const ringX = Math.sin(ringRadians) * metrics.ringRadius;
    const ringZ = Math.cos(ringRadians) * metrics.ringRadius;
    const x = mix(normalX, ringX, morph);
    const y = mix(normalY, 0, morph);
    const z = mix(normalZ, ringZ, morph);
    const rotateY = mix(0, ringAngle, morph);
    const normalCardRotation = normalAngle + smoothCircle * 90;
    const rotateZ = mix(normalCardRotation, 0, morph);
    const scale = mix(normalScale, 1, morph);

    return `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
  });

  const updateInteractivity = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const ringLayout = modeMorph.get() >= 0.5;
    const angle = index * (360 / members.length) + ringRotation.get();
    const facing = !ringLayout || Math.cos(radians(angle)) > -0.06;
    const interactive = !morphing && facing;
    shell.style.pointerEvents = interactive ? 'auto' : 'none';
    shell.setAttribute('aria-hidden', interactive ? 'false' : 'true');
    if (frontFaceRef.current) frontFaceRef.current.setAttribute('aria-hidden', interactive && !flipped ? 'false' : 'true');
    if (backFaceRef.current) backFaceRef.current.setAttribute('aria-hidden', interactive && flipped ? 'false' : 'true');
    if (frontButtonRef.current) frontButtonRef.current.tabIndex = interactive && !flipped ? 0 : -1;
    if (backButtonRef.current) backButtonRef.current.tabIndex = interactive && flipped ? 0 : -1;
    socialRefs.current.forEach((link) => { if (link) link.tabIndex = interactive && flipped ? 0 : -1; });
  }, [flipped, index, modeMorph, morphing, ringRotation]);

  useEffect(() => { updateInteractivity(); }, [updateInteractivity]);
  useMotionValueEvent(modeMorph, 'change', updateInteractivity);
  useMotionValueEvent(ringRotation, 'change', updateInteractivity);

  return (
    <motion.div
      ref={shellRef}
      data-team-member-index={index}
      className="absolute left-1/2 top-1/2"
      style={{ width, height, transform, transformStyle: 'preserve-3d', transformOrigin: 'center center', zIndex, willChange: morphing ? 'transform' : 'auto' }}
    >
      <CardFaces
        member={member}
        flipped={flipped}
        mode={currentMode}
        normalWidth={metrics.normalWidth}
        ringWidth={metrics.ringWidth}
        reducedMotion={reducedMotion}
        onFlip={() => onActivate(index)}
        setSocialRef={setSocialRef}
        frontButtonRef={frontButtonRef}
        backButtonRef={backButtonRef}
        frontFaceRef={frontFaceRef}
        backFaceRef={backFaceRef}
      />
    </motion.div>
  );
});

export const OurTeamSection = forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isTeamInView = useInView(containerRef, { once: false, amount: 0.08 });
  const pageVisible = usePageVisibility();
  const reducedMotion = Boolean(useReducedMotion());
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [mode, setMode] = useState<TeamViewMode>('fan');
  const [morphing, setMorphing] = useState(false);
  const [iconMode, setIconMode] = useState<TeamViewMode>('fan');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [normalFlipped, setNormalFlipped] = useState(false);
  const [ringFlipped, setRingFlipped] = useState<Set<number>>(() => new Set());
  const iconOpacity = useMotionValue(1);
  const morphControls = useRef<ReturnType<typeof animate> | null>(null);
  const inertiaControls = useRef<ReturnType<typeof animate> | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; lastX: number; lastTime: number; moved: boolean; velocity: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const resumeAt = useRef(0);
  const idleBlend = useRef(1);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const normalRotation = useMotionValue(0);
  const ringRotation = useMotionValue(0);
  const badgeTextRotation = useMotionValue(0);
  const badgeLogoRotation = useMotionValue(0);
  const modeMorph = useMotionValue(0);
  const sectionProgress = useTransform(scrollYProgress, (value) => value);
  const metrics = getLayoutMetrics(viewport.width, viewport.height);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  useEffect(() => {
    const update = () => {
      const width = viewportRef.current?.clientWidth ?? window.innerWidth;
      const height = window.innerHeight;
      setViewport((current) => current.width === width && current.height === height ? current : { width, height });
    };
    const observer = new ResizeObserver(update);
    if (viewportRef.current) observer.observe(viewportRef.current);
    window.addEventListener('resize', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const images = [normalModeIcon, ringModeIcon].map((source) => {
      const image = new Image();
      image.src = source;
      return image.decode?.().catch(() => undefined) ?? Promise.resolve();
    });
    void Promise.all(images);
  }, []);

  const previousIconMode = useRef<TeamViewMode>('fan');
  useEffect(() => {
    if (previousIconMode.current === mode) return;
    previousIconMode.current = mode;
    let cancelled = false;
    const fadeOut = animate(iconOpacity, 0, { duration: reducedMotion ? 0.06 : 0.14, ease: 'easeOut' });
    void fadeOut.then(() => {
      if (cancelled) return;
      setIconMode(mode);
      return animate(iconOpacity, 1, { duration: reducedMotion ? 0.08 : 0.18, ease: 'easeIn' });
    });
    return () => {
      cancelled = true;
      fadeOut.stop();
    };
  }, [iconOpacity, mode, reducedMotion]);

  const cancelInertia = useCallback(() => {
    inertiaControls.current?.stop();
    inertiaControls.current = null;
  }, []);

  const releaseCapturedPointer = useCallback(() => {
    const current = drag.current;
    const viewportNode = viewportRef.current;
    if (current && viewportNode?.hasPointerCapture(current.pointerId)) {
      viewportNode.releasePointerCapture(current.pointerId);
    }
    drag.current = null;
  }, []);

  useEffect(() => {
    if (pageVisible && isTeamInView) return;
    cancelInertia();
    releaseCapturedPointer();
    resumeAt.current = Date.now() + 2000;
    idleBlend.current = 0;
  }, [cancelInertia, isTeamInView, pageVisible, releaseCapturedPointer]);

  useEffect(() => () => {
    morphControls.current?.stop();
    morphControls.current = null;
    cancelInertia();
    releaseCapturedPointer();
  }, [cancelInertia, releaseCapturedPointer]);

  useAnimationFrame((_, delta) => {
    if (!isTeamInView || !pageVisible || reducedMotion || morphing) return;
    const elapsed = Math.min(delta, 64);
    if (mode === 'fan' && selectedIndex === null) {
      normalRotation.set(normalRotation.get() - elapsed * 0.075);
    }
    if (mode === 'fan') {
      badgeTextRotation.set(badgeTextRotation.get() + elapsed * 0.0144);
      badgeLogoRotation.set(badgeLogoRotation.get() - elapsed * 0.018);
    }
    if (mode === 'ring' && !drag.current && !inertiaControls.current && Date.now() >= resumeAt.current) {
      idleBlend.current = Math.min(1, idleBlend.current + elapsed / 850);
      ringRotation.set(ringRotation.get() - elapsed * 0.0065 * idleBlend.current);
    }
  });

  const switchMode = useCallback(() => {
    if (morphing) return;
    const nextMode: TeamViewMode = mode === 'fan' ? 'ring' : 'fan';
    setMorphing(true);
    setMode(nextMode);
    setSelectedIndex(null);
    setNormalFlipped(false);
    setRingFlipped(new Set());
    cancelInertia();
    releaseCapturedPointer();
    if (nextMode === 'ring') {
      ringRotation.set(normalRotation.get());
      idleBlend.current = 0;
      resumeAt.current = Date.now();
    } else {
      normalRotation.set(ringRotation.get());
    }
    const controls = animate(modeMorph, nextMode === 'ring' ? 1 : 0, {
      duration: reducedMotion ? 0.22 : 0.88,
      ease: [0.22, 0.72, 0.18, 1],
    });
    morphControls.current = controls;
    void controls.then(() => {
      if (morphControls.current !== controls) return;
      morphControls.current = null;
      setMorphing(false);
      if (nextMode === 'ring') idleBlend.current = 0;
    });
  }, [cancelInertia, mode, modeMorph, morphing, normalRotation, reducedMotion, releaseCapturedPointer, ringRotation]);

  const activateCard = useCallback((index: number) => {
    if (morphing) return;
    if (mode === 'fan') {
      if (selectedIndex === index) setNormalFlipped((current) => !current);
      else {
        setSelectedIndex(index);
        setNormalFlipped(false);
      }
      return;
    }
    if (Date.now() < suppressClickUntil.current) return;
    setRingFlipped((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, [mode, morphing, selectedIndex]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'ring' || morphing || event.button !== 0) return;
    if ((event.target as Element).closest('a')) return;
    cancelInertia();
    resumeAt.current = Number.POSITIVE_INFINITY;
    idleBlend.current = 0;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      moved: false,
      velocity: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [cancelInertia, mode, morphing]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.abs(event.clientX - current.startX) < 7) return;
    current.moved = true;
    const now = performance.now();
    const deltaX = event.clientX - current.lastX;
    const elapsed = Math.max(8, now - current.lastTime);
    ringRotation.set(ringRotation.get() + deltaX * 0.38);
    const instantaneousVelocity = (deltaX * 0.38 * 1000) / elapsed;
    current.velocity = clamp(current.velocity * 0.62 + instantaneousVelocity * 0.38, -900, 900);
    current.lastX = event.clientX;
    current.lastTime = now;
  }, [ringRotation]);

  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const didMove = current.moved;
    const releaseVelocity = clamp(current.velocity, -900, 900);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!didMove) {
      resumeAt.current = Date.now();
      return;
    }
    suppressClickUntil.current = Date.now() + 350;
    if (reducedMotion || Math.abs(releaseVelocity) < 24) {
      resumeAt.current = Date.now() + 2000;
      idleBlend.current = 0;
      return;
    }
    idleBlend.current = 0;
    const controls = animate(ringRotation, ringRotation.get() + releaseVelocity * 0.52, {
      type: 'inertia',
      velocity: releaseVelocity,
      power: 0.52,
      timeConstant: 720,
      restDelta: 0.12,
    });
    inertiaControls.current = controls;
    void controls.then(() => {
      if (inertiaControls.current !== controls) return;
      inertiaControls.current = null;
      resumeAt.current = Date.now() + 2000;
      idleBlend.current = 0;
    });
  }, [reducedMotion, ringRotation]);

  const badgeY = useTransform(() => {
    const scroll = clamp(sectionProgress.get(), 0, 1);
    const circle = clamp((scroll - 0.1) / 0.45, 0, 1);
    const eased = circle * circle * (3 - 2 * circle);
    const center = mix(metrics.fanCenterY, metrics.stageHeight / 2, eased);
    return center - metrics.badgeSize / 2;
  });
  const badgeOpacity = useTransform(() => {
    const scroll = clamp(sectionProgress.get(), 0, 1);
    const circle = clamp((scroll - 0.1) / 0.45, 0, 1);
    const easedCircle = circle * circle * (3 - 2 * circle);
    return mix(0.32, 1, easedCircle) * (1 - modeMorph.get());
  });
  const badgeScale = useTransform(modeMorph, (value) => 1 - value * 0.28);

  return (
    <div
      ref={setRefs}
      id="our-team"
      className="relative z-20 flex min-h-[300vh] w-full flex-col items-center overflow-visible pt-[clamp(120px,18vh,180px)] pb-40"
    >
      <div className="relative z-50 mb-16 flex w-full flex-col items-center px-4 text-center sm:mb-20 sm:px-8">
        <div className="flex max-w-full items-center justify-center gap-3 sm:gap-5">
          <h2 className="min-w-0 text-[clamp(2.2rem,6vw,6.875rem)] leading-none font-black tracking-tight text-white uppercase drop-shadow-2xl">MEET OUR TEAM</h2>
        </div>
        <motion.p animate={{ opacity: mode === 'fan' && selectedIndex !== null ? 0 : 1 }} className="mt-4 text-base font-medium tracking-wide text-white/80 sm:text-xl lg:text-2xl">
          {mode === 'fan' ? 'Click for preview, click again for details!' : 'Drag to rotate • Click a card for details'}
        </motion.p>
      </div>

      <div
        ref={viewportRef}
        className="sticky top-[96px] z-40 w-full max-w-full overflow-visible"
        style={{ height: metrics.stageHeight, perspective: Math.max(560, metrics.ringRadius * 2.5), perspectiveOrigin: '50% 50%', touchAction: mode === 'ring' ? 'pan-y' : 'auto' }}
        onClick={() => {
          if (mode === 'fan' && selectedIndex !== null && !morphing) {
            setSelectedIndex(null);
            setNormalFlipped(false);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <motion.button
          type="button"
          onClick={(event) => { event.stopPropagation(); switchMode(); }}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={morphing}
          aria-label={mode === 'fan' ? 'Switch to ring view' : 'Switch to fan view'}
          aria-pressed={mode === 'ring'}
          title={mode === 'fan' ? 'Ring view' : 'Fan view'}
          className="absolute right-4 top-2 z-50 grid h-14 min-w-[72px] place-items-center rounded-xl p-1 transition-transform hover:scale-105 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d] disabled:cursor-wait"
        >
          <motion.img
            src={iconMode === 'fan' ? normalModeIcon : ringModeIcon}
            alt=""
            draggable={false}
            className="h-10 w-16 object-contain"
            style={{ opacity: iconOpacity }}
          />
        </motion.button>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 flex items-center justify-center bg-[#202121] shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
          style={{
            width: metrics.badgeSize,
            height: metrics.badgeSize,
            x: -metrics.badgeSize / 2,
            y: badgeY,
            z: -16,
            opacity: badgeOpacity,
            scale: badgeScale,
            zIndex: 5,
            clipPath: 'polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)',
          }}
        >
          <motion.div style={{ rotate: badgeTextRotation }} className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg className="h-[92%] w-[92%]" viewBox="0 0 360 360">
              <defs><path id="teamCenterCirclePath" d="M 180, 180 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0" /></defs>
              <text className="fill-white text-[21px] font-extrabold tracking-[0.14em]">
                <textPath href="#teamCenterCirclePath" startOffset="0%" textLength="816" lengthAdjust="spacing">{'•\u00A0Creative Inside\u00A0•\u00A0Impact Outside\u00A0'}</textPath>
              </text>
            </svg>
          </motion.div>
          <motion.div style={{ rotate: badgeLogoRotation }} className="relative z-10 flex h-32 w-32 items-center justify-center">
            <img src={logoDarkTheme} alt="Uni-Inside Logo" className="h-full w-full object-contain drop-shadow-lg" />
          </motion.div>
        </motion.div>

        {members.map((member, index) => {
          const flipped = mode === 'fan'
            ? selectedIndex === index && normalFlipped
            : ringFlipped.has(index);
          return (
            <TeamCard
              key={index}
              index={index}
              member={member}
              metrics={metrics}
              sectionProgress={sectionProgress}
              normalRotation={normalRotation}
              ringRotation={ringRotation}
              modeMorph={modeMorph}
              currentMode={mode}
              morphing={morphing}
              flipped={flipped}
              selected={mode === 'fan' && selectedIndex === index}
              reducedMotion={reducedMotion}
              onActivate={activateCard}
            />
          );
        })}
      </div>
    </div>
  );
});

OurTeamSection.displayName = 'OurTeamSection';
