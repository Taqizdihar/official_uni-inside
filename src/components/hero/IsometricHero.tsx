import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import studioLogo from '../../assets/global/Logo - Light Theme.png';
import craftLogo from '../../assets/global/Uni-Inside Crafts.png';
import { HERO_COPY, HERO_TIMING, HOTSPOTS, WORKSPACES, type HotspotId, type ProjectedHotspot, type Workspace } from './heroConfig';
import type { HeroSceneController } from './heroScene';
import { RollingCounters } from './RollingCounters';
import styles from './Hero.module.css';

const LOGOS = { studioLogo, craftLogo };
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
  const interactionsReady = countersComplete && (sceneSettled || fallback);
  const canInteract = interactionsReady && !busy;
  const heroRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HeroSceneController | null>(null);
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

  const repositionCallout = useCallback(() => {
    const host = hostRef.current;
    const panel = calloutRef.current;
    const anchor = findProjection(projectedRef.current, activeRef.current);
    if (!host || !panel || !anchor) return;
    const { width: panelWidth, height: panelHeight } = calloutSizeRef.current;
    const width = host.clientWidth;
    const height = host.clientHeight;
    const leftSide = anchor.x > width * 0.52;
    const panelX = clamp(leftSide ? anchor.x - panelWidth - 46 : anchor.x + 46, 12, width - panelWidth - 12);
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

  const projectHotspots = useCallback((points: ProjectedHotspot[]) => {
    projectedRef.current = points;
    const width = hostRef.current?.clientWidth ?? 1;
    const height = hostRef.current?.clientHeight ?? 1;
    const compact = width <= 767;
    for (const target of hitTargetsRef.current) target.visible = false;
    for (const point of points) {
      const button = hotspotRefs.current.get(point.id);
      if (!button) continue;
      const targetIndex = HOTSPOT_INDEX.get(point.id);
      if (targetIndex === undefined) continue;
      const target = hitTargetsRef.current[targetIndex];
      let centerX = point.x;
      let centerY = point.y;
      if (compact && point.visible) {
        // Small screens need distinct 44px touch areas; leader lines keep their world-space anchors.
        centerX = clamp(point.x + target.offsetX, TARGET_SIZE / 2 + 2, width - TARGET_SIZE / 2 - 2);
        centerY = clamp(point.y + target.offsetY, TARGET_SIZE / 2 + 2, height - TARGET_SIZE / 2 - 2);
        if (!targetFits(hitTargetsRef.current, centerX, centerY)) {
          for (const offset of TARGET_OFFSETS) {
            const candidateX = clamp(point.x + offset.x, TARGET_SIZE / 2 + 2, width - TARGET_SIZE / 2 - 2);
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
        onSettled: () => {
          if (!cancelled) {
            setSceneSettled(true);
            if (workspaceRef.current === 'studio') {
              busyRef.current = false;
              setBusy(false);
            } else {
              busyRef.current = true;
              setBusy(true);
            }
          }
          reveal();
          saveStats();
          queueMicrotask(() => {
            if (!cancelled && workspaceRef.current !== 'studio') instance?.setWorkspace(workspaceRef.current);
          });
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
  }, [reducedMotion, projectHotspots, selectHotspot]);

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
      data-controls-visible={interactionsReady}
      data-interactions-ready={canInteract}
      data-reduced-motion={reducedMotion}
      data-fallback={fallback}
    >
      <div className={styles.headingCopy}>
        <h1 id="isometric-hero-title" className={styles.title} aria-label={HERO_COPY.title}>
          <span className={`${styles.titleLine} ${styles.accent}`}>Ideas</span>{' '}
          <span className={styles.titleLine}>captured</span>{' '}
          <span className={styles.titleLine}>and made</span>{' '}
          <span className={styles.titleLine}>tangible</span>
        </h1>
        <p className={styles.description}>{HERO_COPY.description}</p>
      </div>

      <div ref={hostRef} className={styles.stage} data-hero-scene="" aria-label={`${current.name} interactive workspace`}>
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

      <RollingCounters start={rollStarted} reducedMotion={reducedMotion || fallback} onComplete={onCountersComplete} />

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
