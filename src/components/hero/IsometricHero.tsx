import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import studioLogo from '../../assets/global/Logo - Light Theme.png';
import craftLogo from '../../assets/global/Uni-Inside Crafts.png';
import studioIntroLogo from '../../assets/global/Uni-Inside Studio White.avif';
import craftIntroLogo from '../../assets/global/Uni-Inside Craft White.avif';
import { HERO_COPY, HERO_TIMING, HOTSPOTS, WORKSPACES, type HotspotId, type ProjectedHotspot, type Workspace } from './heroConfig';
import type { HeroSceneController } from './heroScene';
import { RollingCounters } from './RollingCounters';
import { HeroPullCord } from './HeroPullCord';
import { smoothStep } from './heroMotion';
import styles from './Hero.module.css';

const LOGOS = { studioLogo, craftLogo };
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

export function IsometricHero() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [workspace, setWorkspace] = useState<Workspace>('studio');
  const [contentVisible, setContentVisible] = useState(reducedMotion);
  const [rollStarted, setRollStarted] = useState(reducedMotion);
  const [countersComplete, setCountersComplete] = useState(false);
  const [sceneSettled, setSceneSettled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotId | null>(null);
  const [replayPhase, setReplayPhase] = useState<'idle' | 'bulb-lit' | 'rewinding' | 'replaying-intro'>('idle');
  const [counterCycle, setCounterCycle] = useState(0);
  const interactionsReady = countersComplete && (sceneSettled || fallback);
  const canInteract = interactionsReady && !busy && replayPhase === 'idle';
  const controlsHaveBeenRevealed = interactionsReady && replayPhase === 'idle';
  const cordReady = sceneSettled && countersComplete && !fallback && (replayPhase === 'idle' || replayPhase === 'bulb-lit');
  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const introLayerRef = useRef<HTMLDivElement>(null);
  const studioIntroRef = useRef<HTMLImageElement>(null);
  const craftIntroRef = useRef<HTMLImageElement>(null);
  const radarRefs = useRef(new Map<HotspotId, HTMLSpanElement>());
  const controllerRef = useRef<HeroSceneController | null>(null);
  const pullTimerRef = useRef<number | null>(null);
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
    const panelY = clamp(anchor.y - 94, 12, height - panelHeight - 12);
    const endX = leftSide ? panelX + panelWidth : panelX;
    const endY = panelY + panelHeight / 2;
    const elbowX = anchor.x + (leftSide ? -26 : 26);
    panel.style.transform = `translate3d(${panelX}px, ${panelY}px, 0)`;
    lineRef.current?.setAttribute('points', `${anchor.x},${anchor.y} ${elbowX},${endY} ${endX},${endY}`);
    markerRef.current?.setAttribute('cx', String(anchor.x));
    markerRef.current?.setAttribute('cy', String(anchor.y));
  }, []);

  const selectHotspot = useCallback((id: HotspotId | null) => {
    if (id && (!readyRef.current || busyRef.current || HOTSPOTS.find((hotspot) => hotspot.id === id)?.workspace !== workspaceRef.current)) return;
    activeRef.current = id;
    setActiveHotspot(id);
    controllerRef.current?.setActiveHotspot(id);
    repositionCallout();
  }, [repositionCallout]);

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
        marker.style.transform = `translate3d(${point.x - 4}px, ${point.y - 4}px, 0)`;
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
  }, [repositionCallout]);

  const onCountersComplete = useCallback(() => setCountersComplete(true), []);

  const pullCord = useCallback(() => {
    if (!readyRef.current || busyRef.current || replayPhaseRef.current !== 'idle' || !controllerRef.current) return false;
    replayPhaseRef.current = 'bulb-lit';
    setReplayPhase('bulb-lit');
    busyRef.current = true;
    setBusy(true);
    pinnedRef.current = null;
    focusedRef.current = null;
    selectHotspot(null);
    controllerRef.current.setInteractive(false);
    pullTimerRef.current = window.setTimeout(() => {
      pullTimerRef.current = null;
      if (replayPhaseRef.current !== 'bulb-lit') return;
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
        busyRef.current = false;
        setBusy(false);
      }
    }, reducedMotion ? 240 : 1500);
    return true;
  }, [reducedMotion, selectHotspot]);

  useEffect(() => () => {
    if (pullTimerRef.current !== null) window.clearTimeout(pullTimerRef.current);
  }, []);

  useEffect(() => {
    controllerRef.current?.setInteractive(canInteract && !fallback);
  }, [canInteract, fallback]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    for (const url of [studioIntroLogo, craftIntroLogo]) {
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
      setContentVisible(true);
      contentTimer = window.setTimeout(() => {
        if (!cancelled) setRollStarted(true);
      }, reducedMotion ? 0 : HERO_TIMING.content + 180);
    };
    const useFallback = () => {
      if (cancelled) return;
      if (pullTimerRef.current !== null) window.clearTimeout(pullTimerRef.current);
      pullTimerRef.current = null;
      replayPhaseRef.current = 'idle';
      setReplayPhase('idle');
      if (introLayerRef.current) introLayerRef.current.style.display = 'none';
      setFallback(true);
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
          if (introLayerRef.current) introLayerRef.current.style.display = 'none';
          if (!cancelled) {
            setSceneSettled(true);
            if (replayed || workspaceRef.current === 'studio') {
              busyRef.current = false;
              setBusy(false);
              if (replayed) {
                replayPhaseRef.current = 'idle';
                setReplayPhase('idle');
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
          if (introLayerRef.current) introLayerRef.current.style.display = '';
          replayPhaseRef.current = 'replaying-intro';
          if (!cancelled) setReplayPhase('replaying-intro');
        },
        onTransitionEnd: () => {
          if (!cancelled) {
            busyRef.current = false;
            setBusy(false);
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
  }, [reducedMotion, projectHotspots, selectHotspot, onIntroProgress, onShowcase, onRadarOrder]);

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
    pinnedRef.current = null;
    focusedRef.current = null;
    selectHotspot(null);
    busyRef.current = !fallback;
    setBusy(!fallback);
    setWorkspace(next);
    workspaceRef.current = next;
    if (!fallback) controllerRef.current?.setWorkspace(next);
  };
  const current = WORKSPACES[workspace];
  const active = HOTSPOTS.find((hotspot) => hotspot.id === activeHotspot);

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      aria-labelledby="isometric-hero-title"
      data-hero=""
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
        <h1 id="isometric-hero-title" className={styles.title} aria-label={HERO_COPY.title}>
          <span className={styles.titleLine}><span className={styles.accent}><svg className={styles.bulbIcon} viewBox="0 0 48 72" aria-hidden="true" focusable="false"><path className={styles.bulbFill} d="M24 4c-10 0-17 7-17 17 0 7 4 12 9 17v10h16V38c5-5 9-10 9-17C41 11 34 4 24 4Z" /><path d="M24 4c-10 0-17 7-17 17 0 7 4 12 9 17v10h16V38c5-5 9-10 9-17C41 11 34 4 24 4ZM17 54h14M19 60h10M22 66h4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>deas</span>{' '}captured</span>{' '}
          <span className={styles.titleLine}>and made</span>{' '}
          <span className={styles.titleLine}>tangible</span>
        </h1>
        <p className={styles.description}>
          <span className={styles.descriptionLine}>{DESCRIPTION_LINES[0]}</span>{' '}
          <span className={styles.descriptionLine}>{DESCRIPTION_LINES[1]}</span>
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
              {HOTSPOTS.filter((hotspot) => hotspot.workspace === workspace).map((hotspot) => (
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
      </div>

      <RollingCounters key={counterCycle} start={rollStarted} reducedMotion={reducedMotion || fallback} onComplete={onCountersComplete} />

      {cordReady && <HeroPullCord reducedMotion={reducedMotion} disabled={replayPhase !== 'idle' || busy} onPull={pullCord} />}

      <div className={styles.actions} key={workspace}>
        {workspace === 'studio' ? (
          <>
            <Link className={styles.primaryCta} to="/#contact-us">{current.primary}</Link>
            <Link className={styles.secondaryCta} to="/services">{current.secondary}</Link>
          </>
        ) : (
          <>
            <Link className={styles.primaryCta} to="/products">{current.primary}</Link>
            <Link className={styles.secondaryCta} to="/#contact-us">{current.secondary}</Link>
          </>
        )}
      </div>

      <div className={styles.switcherPosition}>
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
      </div>
    </section>
  );
}
