import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView } from 'motion/react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

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
}

// Character mapping per #3
const charactersRow1: CharacterItem[] = [
  { char: 'C', lottie: cameraData },
  { char: 'R', lottie: rocketData },
  { char: 'E', lottie: pencilData },
  { char: 'A', lottie: brushData },
  { char: 'T', lottie: monitorData },
  { char: 'I', lottie: codeData },
  { char: 'V', lottie: droneData },
  { char: 'E', lottie: lightbulbData },
];

const charactersRow2: CharacterItem[] = [
  { char: 'S', lottie: shutterData },
  { char: 'T', lottie: cameraVideoData },
  { char: 'U', lottie: photoData },
  { char: 'D', lottie: megaphoneData },
  { char: 'I', lottie: soundwaveData },
  { char: 'O', lottie: print3dData },
];

type CharacterAnimationState = 'IDLE' | 'MORPH_TO_ICON' | 'PLAYING' | 'HOLD' | 'MORPH_TO_LETTER';

interface AnimatedCharacterProps {
  item: CharacterItem;
  charIndex: number;
  runId: number;
  textPopStyle?: React.CSSProperties;
}

// Global deterministic timing constants per #4
const MORPH_IN_MS = 250;
const PLAY_MS = 900;
const HOLD_MS = 120;
const MORPH_OUT_MS = 250;

/**
 * Memoized individual character component.
 * Manages exact deterministic global timing schedule, natural typography width,
 * and clean Lottie lifecycle (#1, #2, #3, #4, #5, #6, #7, #8, #10).
 */
export const AnimatedCharacter: React.FC<AnimatedCharacterProps> = React.memo(({
  item,
  charIndex,
  runId,
  textPopStyle,
}) => {
  const [state, setState] = useState<CharacterAnimationState>('IDLE');
  const stateRef = useRef<CharacterAnimationState>('IDLE');
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const isDOMLoadedRef = useRef<boolean>(false);

  const staggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize stateRef with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleDOMLoaded = useCallback(() => {
    isDOMLoadedRef.current = true;
    if (stateRef.current === 'MORPH_TO_ICON' || stateRef.current === 'PLAYING') {
      if (lottieRef.current) {
        lottieRef.current.setSpeed(1.0);
        lottieRef.current.goToAndPlay(0, true);
      }
    }
  }, []);

  // Lottie playback & clipping synchronization (#6, #7, #8)
  useEffect(() => {
    if (state === 'MORPH_TO_ICON' || state === 'PLAYING') {
      if (lottieRef.current && isDOMLoadedRef.current) {
        lottieRef.current.setSpeed(1.0);
        lottieRef.current.goToAndPlay(0, true);
      } else if (lottieRef.current) {
        lottieRef.current.setSpeed(1.0);
        lottieRef.current.goToAndPlay(0, true);
      }

      // Retry interval right after transitioning to MORPH_TO_ICON/PLAYING to ensure Lottie starts
      // when SVG DOM finishes loading asynchronously
      let retries = 0;
      const playRetryInterval = setInterval(() => {
        if ((stateRef.current === 'MORPH_TO_ICON' || stateRef.current === 'PLAYING') && lottieRef.current) {
          if (!isDOMLoadedRef.current || retries === 0) {
            lottieRef.current.setSpeed(1.0);
            lottieRef.current.goToAndPlay(0, true);
          }
        }
        if (++retries >= 6 || isDOMLoadedRef.current) {
          clearInterval(playRetryInterval);
        }
      }, 40);

      return () => {
        clearInterval(playRetryInterval);
      };
    } else if (state === 'HOLD' || state === 'MORPH_TO_LETTER' || state === 'IDLE') {
      // Clip and stop Lottie playback after scheduled play duration (#6, #7, #8)
      if (lottieRef.current) {
        lottieRef.current.pause();
      }
    }
  }, [state]);

  // Global deterministic timeline schedule (#3, #4, #5, #9)
  useEffect(() => {
    if (staggerTimeoutRef.current) clearTimeout(staggerTimeoutRef.current);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    if (lottieRef.current) {
      lottieRef.current.stop();
    }

    setState('IDLE');
    stateRef.current = 'IDLE';

    // Base delay accounting for initial parent entrance animation on refresh (#9)
    const baseDelay = runId === 1 ? 800 : 0;
    const delay = baseDelay + charIndex * 60; // 60ms sequential stagger per character (#4, #5)

    // 1. Morph in begins
    staggerTimeoutRef.current = setTimeout(() => {
      setState('MORPH_TO_ICON');
      stateRef.current = 'MORPH_TO_ICON';
    }, delay);

    // 2. Play icon phase begins (MORPH_IN_MS after morph start)
    playTimeoutRef.current = setTimeout(() => {
      if (stateRef.current !== 'IDLE') {
        setState('PLAYING');
        stateRef.current = 'PLAYING';
      }
    }, delay + MORPH_IN_MS);

    // 3. Hold phase begins (MORPH_IN_MS + PLAY_MS after morph start)
    holdTimeoutRef.current = setTimeout(() => {
      if (stateRef.current !== 'IDLE') {
        setState('HOLD');
        stateRef.current = 'HOLD';
      }
    }, delay + MORPH_IN_MS + PLAY_MS);

    // 4. Morph out begins (MORPH_IN_MS + PLAY_MS + HOLD_MS after morph start)
    returnTimeoutRef.current = setTimeout(() => {
      if (stateRef.current !== 'IDLE') {
        setState('MORPH_TO_LETTER');
        stateRef.current = 'MORPH_TO_LETTER';
      }
    }, delay + MORPH_IN_MS + PLAY_MS + HOLD_MS);

    // 5. Sequence completes and returns to clean LETTER MODE (MORPH_IN_MS + PLAY_MS + HOLD_MS + MORPH_OUT_MS)
    idleTimeoutRef.current = setTimeout(() => {
      if (stateRef.current !== 'IDLE') {
        setState('IDLE');
        stateRef.current = 'IDLE';
      }
    }, delay + MORPH_IN_MS + PLAY_MS + HOLD_MS + MORPH_OUT_MS);

    return () => {
      if (staggerTimeoutRef.current) clearTimeout(staggerTimeoutRef.current);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [runId, charIndex]);

  // Character wrapper preserving natural typography dimensions (#1, #2, #10)
  return (
    <span className="relative inline-flex items-center justify-center w-auto min-w-0 flex-none select-none">
      {/* Invisible layout anchor strictly inheriting natural typography spacing (#1, #2) */}
      <span className="invisible pointer-events-none select-none">
        {item.char}
      </span>

      {/* Letter element (#8, #17, #18, #19) */}
      <motion.span
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={textPopStyle}
        initial={false}
        animate={
          state === 'IDLE'
            ? { opacity: 1, scale: 1 }
            : state === 'MORPH_TO_ICON' || state === 'PLAYING' || state === 'HOLD'
            ? { opacity: 0, scale: 0.92 }
            : { opacity: 1, scale: 1 } // MORPH_TO_LETTER
        }
        transition={{
          opacity: {
            duration: state === 'MORPH_TO_ICON' ? 0.25 : state === 'MORPH_TO_LETTER' ? 0.25 : 0,
            ease: state === 'MORPH_TO_ICON' ? 'easeOut' : 'easeInOut',
          },
          scale: {
            duration: state === 'MORPH_TO_ICON' ? 0.25 : state === 'MORPH_TO_LETTER' ? 0.25 : 0,
            ease: state === 'MORPH_TO_ICON' ? 'easeOut' : 'easeInOut',
          },
        }}
      >
        {item.char}
      </motion.span>

      {/* Lottie Icon element (#2, #7, #8) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={false}
        animate={
          state === 'IDLE'
            ? { opacity: 0, scale: 0.92 }
            : state === 'MORPH_TO_ICON' || state === 'PLAYING' || state === 'HOLD'
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.92 } // MORPH_TO_LETTER
        }
        transition={{
          duration: state === 'MORPH_TO_ICON' ? 0.25 : state === 'MORPH_TO_LETTER' ? 0.25 : 0,
          ease: state === 'MORPH_TO_ICON' ? 'easeOut' : 'easeInOut',
        }}
      >
        {/* Icon sized to fit inside character area without increasing wrapper width (#1, #2) */}
        <div className="w-[0.7em] h-[0.7em] max-w-full max-h-full flex items-center justify-center">
          {/* Unmount Lottie completely when in IDLE letter mode to prevent lingering instances (#7, #8) */}
          {state !== 'IDLE' && (
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
 * Replaces the static heading in Hero without altering surrounding layout or dimensions (#4, #12).
 * Features sequential letter-to-icon morph on mount and on hover (#9, #10).
 */
export const HeroAnimatedHeading: React.FC<HeroAnimatedHeadingProps> = React.memo(({ textPopStyle }) => {
  const [runId, setRunId] = useState<number>(1);
  const containerRef = useRef<HTMLHeadingElement>(null);
  const isInView = useInView(containerRef, { amount: 0.15 });
  const prevInViewRef = useRef<boolean>(true);

  // Replay sequence whenever heading reappears in the viewport after leaving it
  useEffect(() => {
    if (isInView && !prevInViewRef.current) {
      setRunId((prev) => prev + 1);
    }
    prevInViewRef.current = isInView;
  }, [isInView]);

  // Restart sequence on hover (#10)
  const handleMouseEnter = useCallback(() => {
    setRunId((prev) => prev + 1);
  }, []);

  return (
    <h1
      ref={containerRef}
      className="flex flex-col font-black uppercase w-full select-none cursor-default"
      aria-label="Creative Studio"
      onMouseEnter={handleMouseEnter}
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
            charIndex={index}
            runId={runId}
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
            charIndex={index + 8} // Account for Row 1 + space (#3)
            runId={runId}
            textPopStyle={textPopStyle}
          />
        ))}
      </div>
    </h1>
  );
});

HeroAnimatedHeading.displayName = 'HeroAnimatedHeading';

export default HeroAnimatedHeading;
