import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { Link } from 'react-router-dom';
import studioLogo from '../../assets/global/Logo - Light Theme.png';
import craftLogo from '../../assets/global/Uni-Inside Crafts.png';
import studioIntroLogo from '../../assets/global/Uni-Inside Studio White.avif';
import craftIntroLogo from '../../assets/global/Uni-Inside Craft White.avif';
import { HERO_COPY, HERO_TIMING, HOTSPOTS, TRUST_SIGNALS, WORKSPACES, type HotspotId, type ProjectedHotspot, type Workspace } from './heroConfig';
import { usePublicContent } from '../../public/client';
import type { HeroSceneController } from './heroScene';
import { RollingCounters } from './RollingCounters';
import { HeroPullCord } from './HeroPullCord';
import { smoothStep } from './heroMotion';
import styles from './Hero.module.css';

const LOGOS = { studioLogo, craftLogo };
function HeroCta({to,className,children}:{to:string;className:string;children:React.ReactNode}) {
  if (/^https:\/\//i.test(to)) return <a className={className} href={to} rel="noopener noreferrer">{children}</a>;
  return <Link className={className} to={to}>{children}</Link>;
}
const BulbI = () => (<svg className={styles.bulbIcon} viewBox="0 0 48 72" aria-hidden="true" focusable="false"><path className={styles.bulbFill} d="M24 4c-10 0-17 7-17 17 0 7 4 12 9 17v10h16V38c5-5 9-10 9-17C41 11 34 4 24 4Z" /><path d="M24 4c-10 0-17 7-17 17 0 7 4 12 9 17v10h16V38c5-5 9-10 9-17C41 11 34 4 24 4ZM17 54h14M19 60h10M22 66h4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const DESCRIPTION_BREAK = HERO_COPY.description.indexOf('every idea');
const DESCRIPTION_LINES = [HERO_COPY.description.slice(0, DESCRIPTION_BREAK).trimEnd(), HERO_COPY.description.slice(DESCRIPTION_BREAK)];
const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
const TARGET_SIZE = 44;
const TARGET_SPACING = 48;
const HOTSPOT_INDEX = new Map(HOTSPOTS.map(({ id }, index) => [id, index]));
const TARGET_OFFSETS = [{ x: 0, y: 0 }];
for (let distance = 12; distance <= 120; distance += 12) {
  TARGET_OFFSETS.push(
    { x: -distance, y: 0 }, { x: distance, y: 0 },
    { x: 0, y: -distance }, { x: 0, y: distance },
    { x: -distance, y: -distance }, { x: distance, y: -distance },
    { x: -distance, y: distance }, { x: distance, y: distance },
  );
}

interface HitTarget {
  id: HotspotId;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  visible: boolean;
}

interface GuidedTour {
  cycle: number;
  workspace: Workspace;
  order: HotspotId[];
  phase: 'revealing' | 'holding' | 'dismissing';
  visibleCount: number;
  dismissedCount: number;
}

interface GuidedCalloutElements {
  panel: HTMLDivElement | null;
  line: SVGPolylineElement | null;
  marker: SVGCircleElement | null;
}

function targetFits(targets: readonly HitTarget[], x: number, y: number) {
  for (let index = 0; index < targets.length; index += 1) {
    const placed = targets[index];
    if (placed.visible && Math.abs(x - placed.x) < TARGET_SPACING && Math.abs(y - placed.y) < TARGET_SPACING) return false;
  }
  return true;
}

function findProjection(points: readonly ProjectedHotspot[], id: HotspotId | null) {
  for (let index = 0; index < points.length; index += 1) {
    if (points[index].id === id) return points[index];
  }
}

function leaderRoute(anchor: ProjectedHotspot, x: number, y: number, width: number, height: number) {
  if (anchor.x < x - 8 || anchor.x > x + width + 8) {
    const edgeX = anchor.x < x ? x : x + width;
    const elbowX = edgeX + (anchor.x < x ? -22 : 22);
    const edgeY = y + height / 2;
    return `${anchor.x},${anchor.y} ${elbowX},${anchor.y} ${elbowX},${edgeY} ${edgeX},${edgeY}`;
  }
  const edgeY = anchor.y < y + height / 2 ? y : y + height;
  const elbowY = edgeY + (anchor.y < edgeY ? -22 : 22);
  const edgeX = clamp(anchor.x, x + 16, x + width - 16);
  return `${anchor.x},${anchor.y} ${anchor.x},${elbowY} ${edgeX},${elbowY} ${edgeX},${edgeY}`;
}

function anchorOverlap(points: readonly ProjectedHotspot[], x: number, y: number, width: number, height: number) {
  return points.reduce((total, point) => total + (point.visible && point.x >= x - 18 && point.x <= x + width + 18 && point.y >= y - 18 && point.y <= y + height + 18 ? 50000 : 0), 0);
}

export function IsometricHero() {
  const { homepage } = usePublicContent();
  const heroCopy = homepage?.hero;
  const trustSignals = homepage?.heroTrustSignals?.length === 3 ? homepage.heroTrustSignals.map((item, index) => ({value:String(item.numeric_value ?? TRUST_SIGNALS[index].value),plus:String(item.suffix ?? '').includes('+'),suffix:String(item.suffix ?? ''),label:String(item.label ?? TRUST_SIGNALS[index].label)})) : TRUST_SIGNALS;
  const displayHotspots = HOTSPOTS.map(hotspot => {
    const key = `${hotspot.workspace}_${hotspot.id === 'editing' || hotspot.id === 'design' ? 'monitor' : hotspot.id}`;
    const record = homepage?.heroHotspots?.find(item => item.hotspot_key === key && item.is_enabled !== 0);
    return {...hotspot,label:record ? `${record.numeric_value ?? ''}${record.numeric_suffix ?? ''}${record.numeric_value != null ? ' ' : ''}${record.label}`.trim() : hotspot.label};
  });
  const displayWorkspace = (key:Workspace) => homepage?.heroWorkspaces?.find(item=>item.workspace_key===key && item.is_enabled!==0);
  const heroDescription = heroCopy ? [heroCopy.description_line_1 ?? '',heroCopy.description_line_2 ?? ''] : DESCRIPTION_LINES;
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [workspace, setWorkspace] = useState<Workspace>('studio');
  const defaultWorkspaceApplied = useRef(false);
  const [contentVisible, setContentVisible] = useState(reducedMotion);
  const [rollStarted, setRollStarted] = useState(reducedMotion);
  const [countersComplete, setCountersComplete] = useState(false);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);
  const [replayPhase, setReplayPhase] = useState<'idle' | 'bulb-lit' | 'exiting' | 'rewinding' | 'replaying-intro'>('idle');
  const [counterCycle, setCounterCycle] = useState(0);
  const [ctaWorkspace, setCtaWorkspace] = useState<Workspace>('studio');
  const [ctaPhase, setCtaPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [radarOrder, setRadarOrder] = useState<HotspotId[]>([]);
  const [tourCycle, setTourCycle] = useState(0);
  const [tour, setTour] = useState<GuidedTour | null>(null);
  const interactionsReady = countersComplete && (sceneSettled || fallback);
  const canInteract = interactionsReady && !busy && replayPhase === 'idle';
  const controlsHaveBeenRevealed = interactionsReady && (replayPhase === 'idle' || replayPhase === 'bulb-lit' || replayPhase === 'exiting');
  const cordReady = sceneSettled && !fallback && (replayPhase === 'idle' || replayPhase === 'bulb-lit' || replayPhase === 'exiting');
  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const studioIntroRef = useRef<HTMLImageElement>(null);
  const craftIntroRef = useRef<HTMLImageElement>(null);
  const radarRefs = useRef(new Map<HotspotId, HTMLSpanElement>());
  const controllerRef = useRef<HeroSceneController | null>(null);
  const pullTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const ctaPendingRef = useRef<Workspace | null>(null);
  const tourStartedRef = useRef(-1);
  const tourRef = useRef<GuidedTour | null>(null);
  const guidedRefs = useRef(new Map<HotspotId, GuidedCalloutElements>());
  const replayPhaseRef = useRef(replayPhase);
  const hotspotRefs = useRef(new Map<HotspotId, HTMLButtonElement>());
  const hitTargetsRef = useRef<HitTarget[]>(HOTSPOTS.map(({ id }) => ({ id, x: 0, y: 0, offsetX: 0, offsetY: 0, visible: false })));
  const projectedRef = useRef<readonly ProjectedHotspot[]>([]);
  const calloutRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const calloutSizeRef = useRef({ width: 250, height: 46 });
  const focusedRef = useRef<HotspotId | null>(null);
  const pinnedRef = useRef<HotspotId | null>(null);
  const activeRef = useRef<HotspotId | null>(null);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const workspaceRef = useRef<Workspace>('studio');
  readyRef.current = interactionsReady;
  busyRef.current = busy;
  workspaceRef.current = workspace;
  replayPhaseRef.current = replayPhase;
  tourRef.current = tour;

  const stopTour = useCallback(() => {
    tourRef.current = null;
    setTour(null);
    controllerRef.current?.setShowcasePaused(false);
  }, []);

  const enterCta = useCallback((next: Workspace) => {
    ctaPendingRef.current = null;
    setCtaWorkspace(next);
    setCtaPhase(reducedMotion ? 'idle' : 'enter');
  }, [reducedMotion]);

  const repositionGuidedCallouts = useCallback(() => {
    const host = hostRef.current;
    const currentTour = tourRef.current;
    if (!host || !currentTour || currentTour.workspace !== workspaceRef.current) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    const minimumX = width >= 768
      ? Math.max(width * 0.42, (copyRef.current?.offsetLeft ?? 0) + (copyRef.current?.offsetWidth ?? 0) - host.offsetLeft + 20)
      : 8;
    const minimumY = width >= 768 ? 100 : 8;
    const occupied: { x: number; y: number; width: number; height: number }[] = [];
    for (const id of currentTour.order.slice(0, currentTour.visibleCount)) {
      const elements = guidedRefs.current.get(id);
      const anchor = findProjection(projectedRef.current, id);
      if (!elements?.panel || !anchor?.visible) continue;
      const panelWidth = elements.panel.offsetWidth;
      const panelHeight = elements.panel.offsetHeight;
      const leftSide = anchor.x > (minimumX + width) / 2;
      const desiredX = leftSide ? anchor.x - panelWidth - 35 : anchor.x + 35;
      const baseX = clamp(desiredX, minimumX, width - panelWidth - 8);
      const baseY = clamp(anchor.y - 85, minimumY, height - panelHeight - 8);
      let best = { x: baseX, y: baseY, overlap: Infinity };
      const verticalOffsets = [0, -48, 48, -96, 96, -144, 144, -192, 192, -240, 240];
      const horizontalOffsets = [0, leftSide ? -72 : 72, leftSide ? 72 : -72];
      for (const dx of horizontalOffsets) {
        for (const dy of verticalOffsets) {
          const x = clamp(baseX + dx, minimumX, width - panelWidth - 8);
          const y = clamp(baseY + dy, minimumY, height - panelHeight - 8);
          const overlap = occupied.reduce((total, other) => total + Math.max(0, Math.min(x + panelWidth + 5, other.x + other.width + 5) - Math.max(x - 5, other.x - 5)) * Math.max(0, Math.min(y + panelHeight + 5, other.y + other.height + 5) - Math.max(y - 5, other.y - 5)), 0) + anchorOverlap(projectedRef.current, x, y, panelWidth, panelHeight);
          if (overlap < best.overlap) best = { x, y, overlap };
          if (overlap === 0) break;
        }
        if (best.overlap === 0) break;
      }
      occupied.push({ x: best.x, y: best.y, width: panelWidth, height: panelHeight });
      elements.panel.style.transform = `translate3d(${best.x}px, ${best.y}px, 0)`;
      elements.line?.setAttribute('points', leaderRoute(anchor, best.x, best.y, panelWidth, panelHeight));
      elements.marker?.setAttribute('cx', String(anchor.x));
      elements.marker?.setAttribute('cy', String(anchor.y));
    }
  }, []);

  const repositionCallout = useCallback(() => {
    const host = hostRef.current;
    const panel = calloutRef.current;
    const anchor = findProjection(projectedRef.current, activeRef.current);
    if (!host || !panel || !anchor) return;
    const { width: panelWidth, height: panelHeight } = calloutSizeRef.current;
    const width = host.clientWidth;
    const height = host.clientHeight;
    const minimumX = width >= 768
      ? Math.max(width * 0.42, (copyRef.current?.offsetLeft ?? 0) + (copyRef.current?.offsetWidth ?? 0) - host.offsetLeft + 20)
      : 12;
    const leftSide = anchor.x > (minimumX + width) / 2;
    const panelX = clamp(leftSide ? anchor.x - panelWidth - 46 : anchor.x + 46, minimumX, width - panelWidth - 12);
    const panelY = clamp(anchor.y - 94, width >= 768 ? 100 : 12, height - panelHeight - 12);
    panel.style.transform = `translate3d(${panelX}px, ${panelY}px, 0)`;
    lineRef.current?.setAttribute('points', leaderRoute(anchor, panelX, panelY, panelWidth, panelHeight));
    markerRef.current?.setAttribute('cx', String(anchor.x));
    markerRef.current?.setAttribute('cy', String(anchor.y));
  }, []);

  const selectHotspot = useCallback((id: HotspotId | null) => {
    if (id && (!readyRef.current || busyRef.current || HOTSPOTS.find((hotspot) => hotspot.id === id)?.workspace !== workspaceRef.current)) return;
    if (id && tourRef.current) stopTour();
    activeRef.current = id;
    setActiveHotspot(id);
    controllerRef.current?.setActiveHotspot(id);
    repositionCallout();
  }, [repositionCallout, stopTour]);

  const onIntroProgress = useCallback((progress: number) => {
    const stageWidth = hostRef.current?.clientWidth ?? 0;
    const inward = smoothStep((progress - 0.69) / 0.2) * stageWidth * (window.innerWidth < 768 ? 0.4 : 0.33);
    const fadeOut = 1 - smoothStep((progress - 0.79) / 0.11);
    if (studioIntroRef.current) {
      studioIntroRef.current.style.opacity = String(smoothStep((progress - 0.06) / 0.11) * fadeOut);
      studioIntroRef.current.style.transform = `translate3d(calc(-50% + ${inward}px), -50%, 0)`;
    }
    if (craftIntroRef.current) {
      craftIntroRef.current.style.opacity = String(smoothStep((progress - 0.15) / 0.11) * fadeOut);
      craftIntroRef.current.style.transform = `translate3d(calc(-50% - ${inward}px), -50%, 0)`;
    }
  }, []);

  const onShowcase = useCallback((id: HotspotId | null, running: boolean) => {
    const host = hostRef.current;
    if (host) {
      host.dataset.showcaseActive = String(running);
      host.dataset.showcaseId = id ?? '';
    }
    for (const [markerId, marker] of radarRefs.current) marker.dataset.showcaseSelected = String(running && markerId === id);
  }, []);

  const onRadarOrder = useCallback((ids: readonly HotspotId[]) => {
    if (hostRef.current) hostRef.current.dataset.radarReady = String(ids.length === 5);
    ids.forEach((id, index) => radarRefs.current.get(id)?.style.setProperty('--radar-index', String(index)));
    setRadarOrder(previous => previous.length === ids.length && previous.every((id, index) => id === ids[index]) ? previous : [...ids]);
  }, []);

  const projectHotspots = useCallback((points: ProjectedHotspot[]) => {
    projectedRef.current = points;
    const width = hostRef.current?.clientWidth ?? 1;
    const height = hostRef.current?.clientHeight ?? 1;
    const desktop = width >= 768;
    const compact = width * (desktop ? 0.58 : 1) <= 767;
    const minimumX = desktop
      ? Math.max(width * 0.42, (copyRef.current?.offsetLeft ?? 0) + (copyRef.current?.offsetWidth ?? 0) - (hostRef.current?.offsetLeft ?? 0) + 20) + TARGET_SIZE / 2 + 2
      : TARGET_SIZE / 2 + 2;
    for (const target of hitTargetsRef.current) target.visible = false;
    for (const point of points) {
      const button = hotspotRefs.current.get(point.id);
      const marker = radarRefs.current.get(point.id);
      if (marker) {
        marker.style.transform = `translate3d(${point.x - 9}px, ${point.y - 9}px, 0)`;
        marker.style.visibility = point.visible ? 'visible' : 'hidden';
      }
      if (!button) continue;
      const targetIndex = HOTSPOT_INDEX.get(point.id);
      if (targetIndex === undefined) continue;
      const target = hitTargetsRef.current[targetIndex];
      let centerX = point.x;
      let centerY = point.y;
      if (compact && point.visible) {
        // Small screens need distinct 44px touch areas; leader lines keep their world-space anchors.
        centerX = clamp(point.x + target.offsetX, minimumX, width - TARGET_SIZE / 2 - 2);
        centerY = clamp(point.y + target.offsetY, TARGET_SIZE / 2 + 2, height - TARGET_SIZE / 2 - 2);
        if (!targetFits(hitTargetsRef.current, centerX, centerY)) {
          for (const offset of TARGET_OFFSETS) {
            const candidateX = clamp(point.x + offset.x, minimumX, width - TARGET_SIZE / 2 - 2);
            const candidateY = clamp(point.y + offset.y, TARGET_SIZE / 2 + 2, height - TARGET_SIZE / 2 - 2);
            if (!targetFits(hitTargetsRef.current, candidateX, candidateY)) continue;
            centerX = candidateX;
            centerY = candidateY;
            break;
          }
        }
        target.offsetX = centerX - point.x;
        target.offsetY = centerY - point.y;
      } else {
        target.offsetX = 0;
        target.offsetY = 0;
      }
      target.x = centerX;
      target.y = centerY;
      target.visible = point.visible;
      button.style.transform = `translate3d(${centerX - TARGET_SIZE / 2}px, ${centerY - TARGET_SIZE / 2}px, 0)`;
      button.style.visibility = point.visible ? 'visible' : 'hidden';
    }
    repositionCallout();
    repositionGuidedCallouts();
  }, [repositionCallout, repositionGuidedCallouts]);

  const onCountersComplete = useCallback(() => setCountersComplete(true), []);

  const pullCord = useCallback(() => {
    if (!readyRef.current || busyRef.current || replayPhaseRef.current !== 'idle' || !controllerRef.current) return false;
    replayPhaseRef.current = 'bulb-lit';
    setReplayPhase('bulb-lit');
    busyRef.current = true;
    setBusy(true);
    stopTour();
    ctaPendingRef.current = null;
    pinnedRef.current = null;
    focusedRef.current = null;
    selectHotspot(null);
    controllerRef.current.setInteractive(false);
    pullTimerRef.current = window.setTimeout(() => {
      pullTimerRef.current = null;
      if (replayPhaseRef.current !== 'bulb-lit') return;
      replayPhaseRef.current = 'exiting';
      setReplayPhase('exiting');
      exitTimerRef.current = window.setTimeout(() => {
        exitTimerRef.current = null;
        if (replayPhaseRef.current !== 'exiting') return;
        replayPhaseRef.current = 'rewinding';
        setReplayPhase('rewinding');
        setContentVisible(false);
        setRollStarted(false);
        setCountersComplete(false);
        setCounterCycle(cycle => cycle + 1);
        setSceneSettled(false);
        if (!controllerRef.current?.replayIntro()) {
          replayPhaseRef.current = 'idle';
          setReplayPhase('idle');
          setSceneSettled(true);
          setContentVisible(true);
          setRollStarted(true);
          enterCta(workspaceRef.current);
          busyRef.current = false;
          setBusy(false);
        }
      }, reducedMotion ? 0 : 330);
    }, reducedMotion ? 240 : 1500);
    return true;
  }, [enterCta, reducedMotion, selectHotspot, stopTour]);

  useEffect(() => () => {
    if (pullTimerRef.current !== null) window.clearTimeout(pullTimerRef.current);
    if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
  }, []);

  useEffect(() => {
    controllerRef.current?.setInteractive(canInteract && !fallback);
  }, [canInteract, fallback]);

  useEffect(() => {
    if (reducedMotion && ctaPendingRef.current) enterCta(ctaPendingRef.current);
  }, [enterCta, reducedMotion]);

  useEffect(() => {
    if (!canInteract || fallback || radarOrder.length !== 5 || tourCycle === 0 || tourStartedRef.current === tourCycle) return;
    if (radarOrder.some(id => HOTSPOTS.find(hotspot => hotspot.id === id)?.workspace !== workspace)) return;
    tourStartedRef.current = tourCycle;
    controllerRef.current?.setShowcasePaused(true);
    setTour({ cycle: tourCycle, workspace, order: [...radarOrder], phase: 'revealing', visibleCount: 1, dismissedCount: 0 });
  }, [canInteract, fallback, radarOrder, tourCycle, workspace]);

  useEffect(() => {
    if (!tour) return;
    let timer: number;
    if (tour.phase === 'revealing') {
      timer = window.setTimeout(() => setTour(current => {
        if (!current || current.cycle !== tour.cycle || current.workspace !== tour.workspace) return current;
        return current.visibleCount === current.order.length
          ? { ...current, phase: 'holding' }
          : { ...current, visibleCount: current.visibleCount + 1 };
      }), reducedMotion ? 100 : 420);
    } else if (tour.phase === 'holding') {
      timer = window.setTimeout(() => setTour(current => current?.cycle === tour.cycle
        ? { ...current, phase: 'dismissing', dismissedCount: 1 } : current), reducedMotion ? 550 : 1600);
    } else {
      timer = window.setTimeout(() => {
        if (tour.dismissedCount === tour.order.length) stopTour();
        else setTour(current => current?.cycle === tour.cycle
          ? { ...current, dismissedCount: current.dismissedCount + 1 } : current);
      }, reducedMotion ? 90 : 310);
    }
    return () => window.clearTimeout(timer);
  }, [reducedMotion, stopTour, tour]);

  useEffect(() => {
    if (!tour) return;
    repositionGuidedCallouts();
    const observer = new ResizeObserver(repositionGuidedCallouts);
    for (const elements of guidedRefs.current.values()) if (elements.panel) observer.observe(elements.panel);
    return () => observer.disconnect();
  }, [repositionGuidedCallouts, tour]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    for (const url of [studioLogo, craftLogo, studioIntroLogo, craftIntroLogo]) {
      const image = new Image();
      image.src = url;
      void image.decode().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    setSceneSettled(false);
    let cancelled = false;
    let instance: HeroSceneController | null = null;
    let contentTimer = 0;
    const saveStats = () => {
      if (!import.meta.env.DEV) return;
      queueMicrotask(() => {
        if (cancelled || !instance) return;
        const stats = instance.getStats();
        host.dataset.triangles = String(stats.triangles);
        host.dataset.drawCalls = String(stats.calls);
        host.dataset.materials = String(stats.materials);
      });
    };
    const reveal = () => {
      if (cancelled) return;
      window.clearTimeout(contentTimer);
      setContentVisible(true);
      contentTimer = window.setTimeout(() => {
        if (!cancelled) setRollStarted(true);
      }, reducedMotion ? 0 : HERO_TIMING.content + 180);
    };
    const useFallback = () => {
      if (cancelled) return;
      if (pullTimerRef.current !== null) window.clearTimeout(pullTimerRef.current);
      pullTimerRef.current = null;
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
      replayPhaseRef.current = 'idle';
      setReplayPhase('idle');
      if (introLayerRef.current) introLayerRef.current.style.display = 'none';
      setFallback(true);
      stopTour();
      setContentVisible(true);
      setRollStarted(true);
      setCountersComplete(true);
      busyRef.current = false;
      setBusy(false);
    };
    void import('./heroScene').then(({ createHeroScene }) => {
      if (cancelled) return;
      instance = createHeroScene(host, {
        reducedMotion,
        logos: LOGOS,
        onReady: () => {
          if (!cancelled) setFallback(false);
        },
        onSettled: (replayed) => {
          if (cancelled) return;
          if (introLayerRef.current) introLayerRef.current.style.display = 'none';
          if (!cancelled) {
            setSceneSettled(true);
            if (replayed || workspaceRef.current === 'studio') setTourCycle(cycle => cycle + 1);
            if (replayed || workspaceRef.current === 'studio') {
              busyRef.current = false;
              setBusy(false);
              if (replayed) {
                replayPhaseRef.current = 'idle';
                setReplayPhase('idle');
                enterCta(workspaceRef.current);
              }
            } else {
              busyRef.current = true;
              setBusy(true);
            }
          }
          reveal();
          saveStats();
          if (!replayed) queueMicrotask(() => {
            if (!cancelled && workspaceRef.current !== 'studio') instance?.setWorkspace(workspaceRef.current);
          });
        },
        onReplayIntroStart: () => {
          if (cancelled) return;
          if (introLayerRef.current) introLayerRef.current.style.display = '';
          replayPhaseRef.current = 'replaying-intro';
          setReplayPhase('replaying-intro');
        },
        onTransitionEnd: () => {
          if (!cancelled) {
            busyRef.current = false;
            setBusy(false);
            setTourCycle(cycle => cycle + 1);
          }
          saveStats();
        },
        onFallback: useFallback,
        onHover: (id) => {
          if (focusedRef.current || pinnedRef.current) return;
          selectHotspot(id);
        },
        project: projectHotspots,
        onIntroProgress,
        onShowcase,
        onRadarOrder,
      });
      controllerRef.current = instance;
      instance.setInteractive(readyRef.current && !busyRef.current);
      if (workspaceRef.current !== 'studio') instance.setWorkspace(workspaceRef.current);
    }).catch(useFallback);
    return () => {
      cancelled = true;
      window.clearTimeout(contentTimer);
      instance?.dispose();
      if (controllerRef.current === instance) controllerRef.current = null;
    };
  }, [reducedMotion, projectHotspots, selectHotspot, onIntroProgress, onShowcase, onRadarOrder, enterCta, stopTour]);

  useEffect(() => {
    if (!activeHotspot || !calloutRef.current || fallback) return;
    const panel = calloutRef.current;
    const updateSize = () => {
      calloutSizeRef.current = { width: panel.offsetWidth, height: panel.offsetHeight };
      repositionCallout();
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [activeHotspot, fallback, repositionCallout]);

  useEffect(() => {
    const close = () => {
      pinnedRef.current = null;
      focusedRef.current = null;
      selectHotspot(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('[data-hero-hotspot]')) return;
      if (event.target instanceof HTMLCanvasElement && hostRef.current?.contains(event.target)) {
        pinnedRef.current = null;
        focusedRef.current = null;
        return;
      }
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectHotspot]);

  const switchWorkspace = () => {
    if (!readyRef.current || busyRef.current) return;
    const next = workspace === 'studio' ? 'craft' : 'studio';
    stopTour();
    if (reducedMotion || fallback) enterCta(next);
    else {
      ctaPendingRef.current = next;
      setCtaPhase('exit');
    }
    pinnedRef.current = null;
    focusedRef.current = null;
    selectHotspot(null);
    busyRef.current = !fallback;
    setBusy(!fallback);
    setWorkspace(next);
    workspaceRef.current = next;
    if (!fallback) controllerRef.current?.setWorkspace(next);
  };
  useEffect(()=>{if(defaultWorkspaceApplied.current||(!sceneSettled&&!fallback)||!heroCopy)return;defaultWorkspaceApplied.current=true;if(heroCopy.default_workspace==='craft'&&workspaceRef.current==='studio'){setWorkspace('craft');workspaceRef.current='craft';setCtaWorkspace('craft');if(!fallback)controllerRef.current?.setWorkspace('craft');}},[heroCopy,sceneSettled,fallback]);
  const current = WORKSPACES[workspace];
  const cta = WORKSPACES[ctaWorkspace];
  const cmsCta = displayWorkspace(ctaWorkspace);
  const active = displayHotspots.find((hotspot) => hotspot.id === activeHotspot);

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      aria-labelledby="isometric-hero-title"
      data-hero=""
      data-three-line={Boolean(heroCopy?.heading_line_3)}
      data-workspace={workspace}
      data-stage={canInteract ? 'interactive' : contentVisible ? 'settled' : 'intro'}
      data-content-visible={contentVisible}
      data-controls-visible={controlsHaveBeenRevealed}
      data-interactions-ready={canInteract}
      data-reduced-motion={reducedMotion}
      data-fallback={fallback}
      data-replay-phase={replayPhase}
      data-bulb-lit={replayPhase === 'bulb-lit'}
    >
      <div ref={copyRef} className={styles.headingCopy}>
        <h1 id="isometric-hero-title" className={styles.title} aria-label={heroCopy ? `${heroCopy.heading_line_1} ${heroCopy.heading_line_2}${heroCopy.heading_line_3 ? ` ${heroCopy.heading_line_3}` : ''}` : HERO_COPY.title}>
          {heroCopy ? <><span className={styles.titleLine}>{String(heroCopy.heading_line_1).startsWith('I')?<span className={styles.accent}><BulbI />{String(heroCopy.heading_line_1).slice(1)}</span>:heroCopy.heading_line_1}</span>{' '}<span className={styles.titleLine}>{heroCopy.heading_line_2}</span>{heroCopy.heading_line_3&&<>{' '}<span className={styles.titleLine}>{heroCopy.heading_line_3}</span></>}</> : <><span className={styles.titleLine}><span className={styles.accent}><BulbI />deas</span>{' '}captured</span>{' '}<span className={styles.titleLine}>and made</span>{' '}<span className={styles.titleLine}>tangible</span></>}
        </h1>
        <p className={styles.description}>
          <span className={styles.descriptionLine}>{heroDescription[0]}</span>{' '}
          <span className={styles.descriptionLine}>{heroDescription[1]}</span>
        </p>
      </div>

      <div
        ref={hostRef}
        className={styles.stage}
        data-hero-scene=""
        data-radar-active={canInteract && !activeHotspot && !reducedMotion && !fallback && !busy}
        data-radar-ready="false"
        data-showcase-active="false"
        data-showcase-id=""
        data-tour-active={Boolean(tour && tour.workspace === workspace)}
        data-tour-phase={tour?.workspace === workspace ? tour.phase : 'idle'}
        aria-label={`${current.name} interactive workspace`}
      >
        {!reducedMotion && !fallback && (
          <div ref={introLayerRef} className={styles.introLogos} aria-hidden="true">
            <img ref={studioIntroRef} src={studioIntroLogo} className={`${styles.introLogo} ${styles.introStudio}`} alt="" fetchPriority="high" />
            <img ref={craftIntroRef} src={craftIntroLogo} className={`${styles.introLogo} ${styles.introCraft}`} alt="" fetchPriority="high" />
          </div>
        )}
        {!fallback && (
          <div className={styles.radar} aria-hidden="true">
            {HOTSPOTS.map((hotspot) => (
              <span
                key={hotspot.id}
                ref={(element) => {
                  if (element) radarRefs.current.set(hotspot.id, element);
                  else radarRefs.current.delete(hotspot.id);
                }}
                className={styles.radarMarker}
                data-hero-radar={hotspot.id}
                data-showcase-selected="false"
                data-tour-revealed={!tour || tour.workspace !== workspace || tour.order.indexOf(hotspot.id) < tour.visibleCount}
                data-tour-selected={Boolean(tour && tour.workspace === workspace && tour.phase === 'revealing' && tour.order[tour.visibleCount - 1] === hotspot.id)}
              >
                <span className={styles.radarPoint} />
                <span className={styles.radarRing} />
              </span>
            ))}
          </div>
        )}
        {fallback && (
          <div className={styles.fallback}>
            <div className={styles.fallbackLogoFrame}>
              <img src={workspace === 'studio' ? studioLogo : craftLogo} alt="" className={styles.fallbackLogo} />
            </div>
            <p className={styles.fallbackName}>{current.name}</p>
            <div className={styles.fallbackEquipment} aria-label="Explore workspace equipment">
              {displayHotspots.filter((hotspot) => hotspot.workspace === workspace).map((hotspot) => (
                <button
                  type="button"
                  key={hotspot.id}
                  data-hero-hotspot={hotspot.id}
                  aria-label={`${hotspot.object}: ${hotspot.label}`}
                  aria-pressed={activeHotspot === hotspot.id}
                  onClick={() => selectHotspot(activeHotspot === hotspot.id ? null : hotspot.id)}
                >{hotspot.object}</button>
              ))}
            </div>
            <p className={styles.fallbackCallout} role="status">{active?.label || '\u00a0'}</p>
          </div>
        )}
        {!fallback && (
          <div className={styles.hotspots} aria-label="Workspace equipment">
            {HOTSPOTS.map((hotspot) => (
              <button
                type="button"
                key={hotspot.id}
                ref={(element) => {
                  if (element) hotspotRefs.current.set(hotspot.id, element);
                  else hotspotRefs.current.delete(hotspot.id);
                }}
                className={styles.hotspot}
                data-hero-hotspot={hotspot.id}
                disabled={!canInteract || hotspot.workspace !== workspace}
                aria-label={`${hotspot.object}: ${hotspot.label}`}
                aria-expanded={activeHotspot === hotspot.id}
                aria-controls={activeHotspot === hotspot.id ? 'hero-object-callout' : undefined}
                onFocus={() => {
                  focusedRef.current = hotspot.id;
                  selectHotspot(hotspot.id);
                }}
                onBlur={() => {
                  focusedRef.current = null;
                  if (pinnedRef.current !== hotspot.id) selectHotspot(null);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse' && !focusedRef.current && !pinnedRef.current) selectHotspot(hotspot.id);
                }}
                onPointerLeave={() => {
                  if (!focusedRef.current && !pinnedRef.current) selectHotspot(null);
                }}
                onClick={(event) => {
                  pinnedRef.current = event.detail === 0 || pinnedRef.current !== hotspot.id ? hotspot.id : null;
                  selectHotspot(pinnedRef.current);
                }}
              />
            ))}
          </div>
        )}
        {active && !fallback && (
          <div className={styles.calloutOverlay} key={active.id}>
            <svg className={styles.leader} aria-hidden="true">
              <polyline ref={lineRef} className={styles.leaderLine} pathLength="1" />
              <circle ref={markerRef} className={styles.targetMarker} r="10" />
            </svg>
            <div ref={calloutRef} className={styles.calloutPosition}>
              <div id="hero-object-callout" role="status" data-hero-callout="" className={styles.calloutLabel}>{active.label}</div>
            </div>
          </div>
        )}
        {tour && tour.workspace === workspace && !fallback && (
          <div className={styles.calloutOverlay} aria-hidden="true">
            <svg className={styles.leader} aria-hidden="true">
              {tour.order.slice(0, tour.visibleCount).map((id, index) => (
                <g key={id} data-exiting={index < tour.dismissedCount} className={styles.guidedLeader}>
                  <polyline ref={element => {
                    const entry = guidedRefs.current.get(id) ?? { panel: null, line: null, marker: null };
                    entry.line = element;
                    if (element) guidedRefs.current.set(id, entry);
                    else if (!entry.panel && !entry.marker) guidedRefs.current.delete(id);
                  }} className={styles.leaderLine} pathLength="1" />
                  <circle ref={element => {
                    const entry = guidedRefs.current.get(id) ?? { panel: null, line: null, marker: null };
                    entry.marker = element;
                    if (element) guidedRefs.current.set(id, entry);
                    else if (!entry.panel && !entry.line) guidedRefs.current.delete(id);
                  }} className={styles.targetMarker} r="10" />
                </g>
              ))}
            </svg>
            {tour.order.slice(0, tour.visibleCount).map((id, index) => (
              <div key={id} ref={element => {
                const entry = guidedRefs.current.get(id) ?? { panel: null, line: null, marker: null };
                entry.panel = element;
                if (element) guidedRefs.current.set(id, entry);
                else if (!entry.line && !entry.marker) guidedRefs.current.delete(id);
              }} className={styles.calloutPosition} data-hero-guided-callout={id} data-exiting={index < tour.dismissedCount}>
                <div className={styles.calloutLabel}>{displayHotspots.find(item => item.id === id)!.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RollingCounters key={counterCycle} signals={trustSignals} start={rollStarted} reducedMotion={reducedMotion || fallback} onComplete={onCountersComplete} />

      {cordReady && <HeroPullCord reducedMotion={reducedMotion} disabled={replayPhase !== 'idle' || busy} onPull={pullCord} />}

      <div className={styles.actions}>
        <LayoutGroup id="hero-action-layout">
          <div
            className={styles.ctaGroup}
            data-cta-phase={ctaPhase}
            data-cta-workspace={ctaWorkspace}
            onAnimationEnd={event => {
              if (event.target !== event.currentTarget) return;
              if (ctaPhase === 'exit' && ctaPendingRef.current) enterCta(ctaPendingRef.current);
              else if (ctaPhase === 'enter') setCtaPhase('idle');
            }}
          >
            {ctaWorkspace === 'studio' ? (
              <>
                <HeroCta className={styles.primaryCta} to={cmsCta?.primary_cta_url||'/#contact-us'}>{cmsCta?.primary_cta_label||cta.primary}</HeroCta>
                <HeroCta className={styles.secondaryCta} to={cmsCta?.secondary_cta_url||'/services'}>{cmsCta?.secondary_cta_label||cta.secondary}</HeroCta>
              </>
            ) : (
              <>
                <HeroCta className={styles.primaryCta} to={cmsCta?.primary_cta_url||'/products'}>{cmsCta?.primary_cta_label||cta.primary}</HeroCta>
                <HeroCta className={styles.secondaryCta} to={cmsCta?.secondary_cta_url||'/#contact-us'}>{cmsCta?.secondary_cta_label||cta.secondary}</HeroCta>
              </>
            )}
          </div>
          <motion.div
            className={styles.switcherPosition}
            layout="position"
            initial={false}
            transition={{ layout: { duration: reducedMotion ? 0 : 0.34, ease: [0.2, 0.8, 0.2, 1] } }}
          >
            <button
              type="button"
              className={styles.switcher}
              onClick={switchWorkspace}
              disabled={!canInteract}
              aria-label={`Switch to ${WORKSPACES[workspace === 'studio' ? 'craft' : 'studio'].name}`}
              aria-pressed={workspace === 'craft'}
            >
              <span className={styles.switcherThumb}>
                <img src={workspace === 'studio' ? studioLogo : craftLogo} alt="" />
              </span>
            </button>
            <span className={styles.srOnly} role="status">{current.name} active</span>
          </motion.div>
        </LayoutGroup>
      </div>
    </section>
  );
}
