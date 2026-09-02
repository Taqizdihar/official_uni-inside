import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useInView } from 'motion/react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useElementVisibility } from '../hooks/useElementVisibility';

// Import all 14 Lottie JSON files exactly once at module level (#15)
import print3dData from '../assets/lottie/creative/3d-print.json';
import brushData from '../assets/lottie/creative/brush.json';
import cameraVideoData from '../assets/lottie/creative/camera-video.json';
import cameraData from '../assets/lottie/creative/camera.json';
import codeData from '../assets/lottie/creative/code.json';
import droneData from '../assets/lottie/creative/drone.json';
import lightbulbData from '../assets/lottie/creative/lightbulb.json';
import megaphoneData from '../assets/lottie/creative/megaphone.json';
import monitorData from '../assets/lottie/creative/monitor.json';
import pencilData from '../assets/lottie/creative/pencil.json';
import photoData from '../assets/lottie/creative/photo.json';
import rocketData from '../assets/lottie/creative/rocket.json';
import shutterData from '../assets/lottie/creative/shutter.json';
import soundwaveData from '../assets/lottie/creative/soundwave.json';

export interface CharacterItem {
  char: string;
  lottie: any;
  scale?: number;
}

// Character mapping with per-icon scale refinement (#1, #3)
const charactersRow1: CharacterItem[] = [
  { char: 'C', lottie: cameraData },
  { char: 'R', lottie: rocketData, scale: 1.30 },
  { char: 'E', lottie: pencilData },
  { char: 'A', lottie: brushData },
  { char: 'T', lottie: monitorData },
  { char: 'I', lottie: codeData, scale: 1.50 },
  { char: 'V', lottie: droneData },
  { char: 'E', lottie: lightbulbData },
];

const charactersRow2: CharacterItem[] = [
  { char: 'S', lottie: shutterData },
  { char: 'T', lottie: cameraVideoData },
  { char: 'U', lottie: photoData },
  { char: 'D', lottie: megaphoneData, scale: 1.30 },
  { char: 'I', lottie: soundwaveData, scale: 1.30 },
  { char: 'O', lottie: print3dData, scale: 1.30 },
];

type CharacterAnimationState = 'IDLE' | 'MORPH_TO_ICON' | 'PLAYING' | 'HOLD' | 'MORPH_TO_LETTER';

interface AnimatedCharacterProps {
  item: CharacterItem;
  state: CharacterAnimationState;
  textPopStyle?: React.CSSProperties;
}

// Global deterministic timing constants per #4
const MORPH_IN_MS = 350;
const PLAY_MS = 850;
const HOLD_MS = 200; // PLAY_MS + HOLD_MS = 1050ms total icon visibility (#4)
const MORPH_OUT_MS = 350;
const STAGGER_MS = 60; // 60ms sequential stagger per character (#5)
const INITIAL_RUN_DELAY_MS = 800; // accounts for the parent entrance animation on refresh
const LOOP_GAP_MS = 300;

const TOTAL_CHARACTERS = charactersRow1.length + charactersRow2.length;
const IDLE_PHASES: CharacterAnimationState[] = Array.from({ length: TOTAL_CHARACTERS }, () => 'IDLE');

interface TimelineEvent {
  at: number;
  index: number;
  phase: CharacterAnimationState;
}

/**
 * The whole heading sequence as one ordered event list.
 *
 * Every character keeps its original stagger and phase durations, but the
 * schedule is owned by the parent instead of by dozens of per-letter timers and
 * Lottie retry intervals.
 */
const buildTimeline = (baseDelay: number): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  for (let index = 0; index < TOTAL_CHARACTERS; index += 1) {
    const delay = baseDelay + index * STAGGER_MS;
    events.push({ at: delay, index, phase: 'MORPH_TO_ICON' });
    events.push({ at: delay + MORPH_IN_MS, index, phase: 'PLAYING' });
    events.push({ at: delay + MORPH_IN_MS + PLAY_MS, index, phase: 'HOLD' });
    events.push({ at: delay + MORPH_IN_MS + PLAY_MS + HOLD_MS, index, phase: 'MORPH_TO_LETTER' });
    events.push({ at: delay + MORPH_IN_MS + PLAY_MS + HOLD_MS + MORPH_OUT_MS, index, phase: 'IDLE' });
  }
  return events.sort((first, second) => first.at - second.at);
};

const cycleDuration = (baseDelay: number) =>
  baseDelay + (TOTAL_CHARACTERS - 1) * STAGGER_MS + MORPH_IN_MS + PLAY_MS + HOLD_MS + MORPH_OUT_MS + LOOP_GAP_MS;

/**
 * Memoized individual character component.
 * Purely presentational: rotational card-flip 3D morphing, natural typography
 * width, and clean Lottie lifecycle (#1, #2, #3, #6, #7, #8).
 */
export const AnimatedCharacter: React.FC<AnimatedCharacterProps> = React.memo(({
  item,
  state,
  textPopStyle,
}) => {
  const stateRef = useRef<CharacterAnimationState>(state);
  stateRef.current = state;
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const handleDOMLoaded = useCallback(() => {
    if (stateRef.current === 'MORPH_TO_ICON' || stateRef.current === 'PLAYING') {
      lottieRef.current?.setSpeed(1.0);
      lottieRef.current?.goToAndPlay(0, true);
    }
  }, []);

  // Lottie playback & clipping synchronization (#4, #6, #8)
  useEffect(() => {
    if (state === 'MORPH_TO_ICON' || state === 'PLAYING') {
      lottieRef.current?.setSpeed(1.0);
      lottieRef.current?.goToAndPlay(0, true);
    } else {
      lottieRef.current?.pause();
    }
  }, [state]);

  const isIconActive = state === 'MORPH_TO_ICON' || state === 'PLAYING' || state === 'HOLD';
  const isIdle = state === 'IDLE';
  // Only promote a character while it is actually flipping.
  const willChange = isIdle ? 'auto' : 'transform';

  // Character cell preserving natural typography dimensions with 3D perspective (#1, #2, #8)
  return (
    <span
      className="relative inline-flex items-center justify-center w-auto min-w-0 flex-none select-none"
      style={{
        perspective: '800px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Invisible layout anchor strictly inheriting natural typography spacing (#1) */}
      <span className="invisible pointer-events-none select-none">
        {item.char}
      </span>

      {/* Letter element card face (#2, #3, #8) */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          ...textPopStyle,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          willChange,
        }}
        initial={false}
        animate={{
          rotateY: state === 'IDLE' ? 0 : isIconActive ? 180 : 360,
          opacity: state === 'IDLE' ? 1 : isIconActive ? 0 : 1,
        }}
        transition={{
          rotateY: {
            duration: state === 'IDLE' ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
          opacity: {
            duration: state === 'IDLE' ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
        }}
      >
        {item.char}
      </motion.span>

      {/* Lottie Icon element card face (#2, #3, #8) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
          willChange,
        }}
        initial={false}
        animate={{
          rotateY: state === 'IDLE' ? -180 : isIconActive ? 0 : 180,
          opacity: state === 'IDLE' ? 0 : isIconActive ? 1 : 0,
        }}
        transition={{
          rotateY: {
            duration: state === 'IDLE' ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
          opacity: {
            duration: state === 'IDLE' ? 0 : 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
        }}
      >
        {/* Icon container scaled inside character area without increasing wrapper width (#1, #8) */}
        <div
          className="w-[0.7em] h-[0.7em] max-w-full max-h-full flex items-center justify-center relative"
          style={{
            transform: item.scale && item.scale !== 1 ? `scale(${item.scale}) translateZ(0)` : 'translateZ(0)',
            transformOrigin: 'center center',
            willChange,
          }}
        >
          {/* Unmount Lottie completely when in IDLE letter mode to prevent lingering instances */}
          {!isIdle && (
            <Lottie
              lottieRef={lottieRef}
              animationData={item.lottie}
              loop={false}
              autoplay={false}
              onDOMLoaded={handleDOMLoaded}
              onLoadedImages={handleDOMLoaded}
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </motion.div>
    </span>
  );
});

AnimatedCharacter.displayName = 'AnimatedCharacter';

export interface HeroAnimatedHeadingProps {
  textPopStyle?: React.CSSProperties;
}

/**
 * HeroAnimatedHeading Component
 * Replaces the static heading in Hero without altering surrounding layout or dimensions.
 * Features sequential rotational letter-to-icon morph on mount and non-interrupting hover loop (#7).
 */
export const HeroAnimatedHeading: React.FC<HeroAnimatedHeadingProps> = React.memo(({ textPopStyle }) => {
  const [runId, setRunId] = useState<number>(1);
  const [phases, setPhases] = useState<CharacterAnimationState[]>(IDLE_PHASES);
  const containerRef = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(containerRef, { amount: 0.15 });
  const { isVisible: isNearViewport, isPageVisible } = useElementVisibility(containerRef, '300px 0px');
  const canRun = isNearViewport && isPageVisible;
  const prevInViewRef = useRef<boolean>(true);
  const isHoveredRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(true); // True initially for runId === 1

  const timeline = useMemo(() => buildTimeline(runId === 1 ? INITIAL_RUN_DELAY_MS : 0), [runId]);
  const totalCycleDuration = useMemo(() => cycleDuration(runId === 1 ? INITIAL_RUN_DELAY_MS : 0), [runId]);

  // One parent-owned schedule drives every character: a single chained timer,
  // no per-character timeouts and no per-character retry intervals (#4, #5, #6).
  useEffect(() => {
    setPhases(IDLE_PHASES);
    isPlayingRef.current = true;
  }, [runId]);

  const cursorRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    cursorRef.current = 0;
    elapsedRef.current = 0;
  }, [runId]);

  useEffect(() => {
    if (!canRun) return;

    let timer = 0;
    let startedAt = performance.now() - elapsedRef.current;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startedAt;
      elapsedRef.current = elapsed;

      const due: TimelineEvent[] = [];
      while (cursorRef.current < timeline.length && timeline[cursorRef.current].at <= elapsed + 1) {
        due.push(timeline[cursorRef.current]);
        cursorRef.current += 1;
      }

      if (due.length > 0) {
        setPhases((previous) => {
          const next = previous.slice();
          due.forEach((event) => { next[event.index] = event.phase; });
          return next;
        });
      }

      if (cursorRef.current < timeline.length) {
        timer = window.setTimeout(step, Math.max(0, timeline[cursorRef.current].at - elapsed));
        return;
      }

      if (elapsed + 1 >= totalCycleDuration) {
        isPlayingRef.current = false;
        // If still hovered when the cycle completes, repeat naturally (#7)
        if (isHoveredRef.current) setRunId((previous) => previous + 1);
        return;
      }
      timer = window.setTimeout(step, Math.max(0, totalCycleDuration - elapsed));
    };

    step();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Remember how far the sequence got so a resume never skips or repeats a stage.
      elapsedRef.current = performance.now() - startedAt;
    };
  }, [canRun, timeline, totalCycleDuration]);

  // Replay sequence whenever heading reappears in the viewport after leaving it
  useEffect(() => {
    if (isInView && !prevInViewRef.current) {
      if (!isPlayingRef.current) {
        setRunId((prev) => prev + 1);
      }
    }
    prevInViewRef.current = isInView;
  }, [isInView]);

  // Non-interrupting hover start (#7)
  const handleMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
    // If no sequence is currently running, start sequence immediately (#7)
    if (!isPlayingRef.current) {
      setRunId((prev) => prev + 1);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    // Let current sequence finish naturally and return to text cleanly (#7)
  }, []);

  return (
    <h1
      ref={containerRef}
      className="flex flex-col font-black uppercase w-full select-none cursor-default"
      aria-label="Creative Studio"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Row 1: CREATIVE */}
      <div
        className="flex items-center text-6xl sm:text-7xl lg:text-[110px]"
        style={{ lineHeight: 0.9 }}
        aria-hidden="true"
      >
        {charactersRow1.map((item, index) => (
          <AnimatedCharacter
            key={`row1-${item.char}-${index}`}
            item={item}
            state={phases[index]}
            textPopStyle={textPopStyle}
          />
        ))}
      </div>

      {/* Row 2: STUDIO */}
      <div
        className="flex items-center text-6xl sm:text-7xl lg:text-[110px]"
        style={{ lineHeight: 0.9 }}
        aria-hidden="true"
      >
        {charactersRow2.map((item, index) => (
          <AnimatedCharacter
            key={`row2-${item.char}-${index}`}
            item={item}
            state={phases[index + 8]} // Account for Row 1 + space (#3)
            textPopStyle={textPopStyle}
          />
        ))}
      </div>
    </h1>
  );
});

HeroAnimatedHeading.displayName = 'HeroAnimatedHeading';

export default HeroAnimatedHeading;
