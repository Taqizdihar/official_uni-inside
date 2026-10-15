import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import styles from './Hero.module.css';

interface Point { x: number; y: number; oldX: number; oldY: number }

const INITIAL_ANCHOR_X = 90;
const ANCHOR_Y = 7;
const REST_Y = 575;
const SEGMENTS = 16;
const REST_SEGMENT = (REST_Y - ANCHOR_Y) / SEGMENTS;

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

/** A small, locally scoped Verlet rope; its only interactive surface is the grip. */
export function HeroPullCord({ reducedMotion, disabled, onPull }: {
  reducedMotion: boolean;
  disabled: boolean;
  onPull: () => boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dropped, setDropped] = useState(reducedMotion);
  const pathRef = useRef<SVGPathElement>(null);
  const gripRef = useRef<HTMLButtonElement>(null);
  const pullRef = useRef(onPull);
  const disabledRef = useRef(disabled);
  const physicsRef = useRef<{
    points: Point[];
    dragging: boolean;
    pointerId: number | null;
    targetX: number;
    targetY: number;
    dragStartY: number;
    maxPull: number;
    lastY: number;
    lastMoveTime: number;
    releaseVelocity: number;
    extension: number;
    growth: number;
    ready: boolean;
    fired: boolean;
  } | null>(null);
  pullRef.current = onPull;
  disabledRef.current = disabled;

  useEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    const grip = gripRef.current;
    if (!root || !path || !grip) return;
    const drawing = root.querySelector('svg');
    const getAnchorX = () => window.innerWidth >= 768 ? root.offsetWidth * 0.44 : root.offsetWidth / 2;
    let anchorX = getAnchorX();
    drawing?.setAttribute('viewBox', `0 0 ${root.offsetWidth} 700`);
    grip.style.left = `${anchorX}px`;
    if (reducedMotion) {
      setDropped(true);
      path.setAttribute('d', `M ${anchorX} ${ANCHOR_Y} L ${anchorX} ${REST_Y}`);
      const observer = new ResizeObserver(() => {
        anchorX = getAnchorX();
        drawing?.setAttribute('viewBox', `0 0 ${root.offsetWidth} 700`);
        path.setAttribute('d', `M ${anchorX} ${ANCHOR_Y} L ${anchorX} ${REST_Y}`);
        grip.style.left = `${anchorX}px`;
      });
      observer.observe(root);
      return () => observer.disconnect();
    }
    setDropped(false);
    const points: Point[] = Array.from({ length: SEGMENTS + 1 }, (_, index) => ({
      x: anchorX, y: ANCHOR_Y + index * 2, oldX: anchorX, oldY: ANCHOR_Y + index * 2,
    }));
    const physics = {
      points, dragging: false, pointerId: null as number | null,
      targetX: anchorX, targetY: REST_Y, dragStartY: REST_Y, maxPull: 0,
      lastY: REST_Y, lastMoveTime: 0, releaseVelocity: 0,
      extension: 0, growth: 0, ready: false, fired: false,
    };
    physicsRef.current = physics;
    let frame: number | null = null;
    let lastTime = 0;
    let visible = false;

    const tick = (timestamp: number) => {
      frame = null;
      if (!visible || document.hidden) { lastTime = 0; return; }
      const dt = lastTime ? clamp((timestamp - lastTime) / 1000, 0, 0.033) : 1 / 60;
      lastTime = timestamp;
      physics.growth = Math.min(1, physics.growth + dt / 1.1);
      if (physics.growth >= 0.98 && !physics.ready) {
        physics.ready = true;
        setDropped(true);
      }
      if (physics.dragging) physics.extension = Math.max(0, physics.targetY - REST_Y) * 0.78;
      else physics.extension *= Math.exp(-dt * 9);
      const segmentLength = 2 + (REST_SEGMENT - 2) * physics.growth + physics.extension / SEGMENTS;

      for (let index = 1; index < points.length; index++) {
        const point = points[index];
        const velocityX = (point.x - point.oldX) * 0.985;
        const velocityY = (point.y - point.oldY) * 0.985;
        point.oldX = point.x;
        point.oldY = point.y;
        point.x += velocityX + Math.sin(timestamp * 0.00085 + index * 0.28) * 12 * dt * dt;
        point.y += velocityY + 1100 * dt * dt;
      }
      for (let iteration = 0; iteration < 9; iteration++) {
        points[0].x = anchorX;
        points[0].y = ANCHOR_Y;
        if (physics.dragging) {
          points[SEGMENTS].x = physics.targetX;
          points[SEGMENTS].y = physics.targetY;
        }
        for (let index = 0; index < SEGMENTS; index++) {
          const first = points[index];
          const second = points[index + 1];
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const distance = Math.max(0.001, Math.hypot(dx, dy));
          const correction = (distance - segmentLength) / distance;
          if (index === 0) {
            second.x -= dx * correction;
            second.y -= dy * correction;
          } else if (physics.dragging && index === SEGMENTS - 1) {
            first.x += dx * correction;
            first.y += dy * correction;
          } else {
            first.x += dx * correction * 0.5;
            first.y += dy * correction * 0.5;
            second.x -= dx * correction * 0.5;
            second.y -= dy * correction * 0.5;
          }
        }
      }
      const pathData = [`M ${anchorX.toFixed(1)} ${ANCHOR_Y.toFixed(1)}`];
      for (let index = 1; index < points.length; index++) {
        pathData.push(`L ${points[index].x.toFixed(1)} ${points[index].y.toFixed(1)}`);
      }
      path.setAttribute('d', pathData.join(' '));
      grip.style.left = `${points[SEGMENTS].x}px`;
      grip.style.top = `${points[SEGMENTS].y}px`;
      frame = window.requestAnimationFrame(tick);
    };
    const resume = () => {
      if (visible && !document.hidden && frame === null) frame = window.requestAnimationFrame(tick);
      else if (!visible || document.hidden) {
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
        lastTime = 0;
      }
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      resume();
    }, { threshold: 0.01 });
    observer.observe(root);
    const resizeObserver = new ResizeObserver(() => {
      const nextAnchorX = getAnchorX();
      const shift = nextAnchorX - anchorX;
      anchorX = nextAnchorX;
      drawing?.setAttribute('viewBox', `0 0 ${root.offsetWidth} 700`);
      for (const point of points) {
        point.x += shift;
        point.oldX += shift;
      }
      physics.targetX += shift;
      if (!physics.dragging) grip.style.left = `${points[SEGMENTS].x}px`;
    });
    resizeObserver.observe(root);
    document.addEventListener('visibilitychange', resume);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (physics.pointerId !== null && grip.hasPointerCapture(physics.pointerId)) grip.releasePointerCapture(physics.pointerId);
      physicsRef.current = null;
    };
  }, [reducedMotion]);

  const pointerPoint = (event: ReactPointerEvent) => {
    const root = rootRef.current!;
    const rect = root.getBoundingClientRect();
    const anchorX = window.innerWidth >= 768 ? root.offsetWidth * 0.44 : root.offsetWidth / 2;
    const reach = window.innerWidth >= 768 ? Math.min(root.offsetWidth * 0.38, 420) : 70;
    return {
      x: clamp((event.clientX - rect.left) * root.offsetWidth / rect.width, anchorX - reach, anchorX + reach),
      y: clamp((event.clientY - rect.top) * root.offsetHeight / rect.height, REST_Y - 35, REST_Y + 170),
    };
  };

  return (
    <div ref={rootRef} className={styles.pullCord} data-hero-cord="" data-cord-ready={dropped}>
      <svg className={styles.cordDrawing} viewBox="0 0 180 700" aria-hidden="true">
        <path ref={pathRef} d={`M ${INITIAL_ANCHOR_X} ${ANCHOR_Y} L ${INITIAL_ANCHOR_X} ${reducedMotion ? REST_Y : ANCHOR_Y + SEGMENTS * 2}`} className={styles.cordPath} />
      </svg>
      <button
        ref={gripRef}
        type="button"
        className={styles.cordHandle}
        style={{ top: reducedMotion ? REST_Y : ANCHOR_Y + SEGMENTS * 2 }}
        aria-label="Replay hero animation"
        data-dragging={physicsRef.current?.dragging ?? false}
        disabled={disabled || !dropped}
        onPointerDown={(event) => {
          if (disabledRef.current || reducedMotion) return;
          const physics = physicsRef.current;
          if (!physics || physics.fired || !physics.ready) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          physics.dragging = true;
          physics.pointerId = event.pointerId;
          physics.maxPull = 0;
          physics.lastMoveTime = event.timeStamp;
          const point = pointerPoint(event);
          physics.targetX = point.x;
          physics.targetY = point.y;
          physics.dragStartY = physics.points[SEGMENTS].y;
          physics.lastY = point.y;
          event.currentTarget.dataset.dragging = 'true';
        }}
        onPointerMove={(event) => {
          const physics = physicsRef.current;
          if (!physics?.dragging || physics.pointerId !== event.pointerId) return;
          const point = pointerPoint(event);
          const dt = Math.max(0.008, (event.timeStamp - physics.lastMoveTime) / 1000);
          physics.releaseVelocity = clamp((point.y - physics.lastY) / dt, -400, 400);
          physics.targetX = point.x;
          physics.targetY = point.y;
          physics.maxPull = Math.max(physics.maxPull, point.y - physics.dragStartY);
          physics.lastY = point.y;
          physics.lastMoveTime = event.timeStamp;
        }}
        onPointerUp={(event) => {
          const physics = physicsRef.current;
          if (!physics?.dragging || physics.pointerId !== event.pointerId) return;
          physics.dragging = false;
          physics.pointerId = null;
          physics.points[SEGMENTS].oldY = physics.points[SEGMENTS].y - physics.releaseVelocity / 60;
          event.currentTarget.dataset.dragging = 'false';
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (physics.maxPull >= clamp(window.innerHeight * 0.085, 64, 90) && !physics.fired && !disabledRef.current) {
            physics.fired = pullRef.current();
          }
        }}
        onPointerCancel={(event) => {
          const physics = physicsRef.current;
          if (!physics || physics.pointerId !== event.pointerId) return;
          physics.dragging = false;
          physics.pointerId = null;
          event.currentTarget.dataset.dragging = 'false';
        }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabledRef.current) {
            event.preventDefault();
            pullRef.current();
          }
        }}
        onClick={(event) => {
          if (reducedMotion && event.detail > 0 && !disabledRef.current) pullRef.current();
        }}
      ><span className={styles.cordGrip} /></button>
    </div>
  );
}
