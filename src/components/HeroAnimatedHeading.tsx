import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
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

type CharacterAnimationState = 'IDLE' | 'MORPH_TO_ICON' | 'HOLD' | 'MORPH_TO_LETTER';

interface AnimatedCharacterProps {
  item: CharacterItem;
  charIndex: number;
  runId: number;
  textPopStyle?: React.CSSProperties;
}

/**
 * Memoized individual character component.
 * Manages exact sequential timing, Lottie playback, and Framer Motion morphing
 * while keeping an immutable layout box to prevent any reflow/layout shifts (#12, #13, #15).
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
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize stateRef with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleLottieComplete = useCallback(() => {
    if (stateRef.current === 'MORPH_TO_ICON' || stateRef.current === 'HOLD') {
      setState('HOLD');
      stateRef.current = 'HOLD';

      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      // After finishing Lottie: hold for about 150–200 ms (180ms) before morphing back (#7, #19)
      holdTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === 'HOLD') {
          setState('MORPH_TO_LETTER');
          stateRef.current = 'MORPH_TO_LETTER';

          if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
          // Morph back duration ≈ 250ms (#19)
          returnTimeoutRef.current = setTimeout(() => {
            if (stateRef.current === 'MORPH_TO_LETTER') {
              setState('IDLE');
              stateRef.current = 'IDLE';
            }
          }, 250);
        }
      }, 180);
    }
  }, []);

  const handleDOMLoaded = useCallback(() => {
    isDOMLoadedRef.current = true;
    if (stateRef.current === 'MORPH_TO_ICON') {
      if (lottieRef.current) {
        lottieRef.current.setSpeed(1.0);
        lottieRef.current.goToAndPlay(0, true);
      }
    }
  }, []);

  // Lottie playback synchronization (#7)
  useEffect(() => {
    if (state === 'MORPH_TO_ICON') {
      if (lottieRef.current && isDOMLoadedRef.current) {
        lottieRef.current.setSpeed(1.0);
        lottieRef.current.goToAndPlay(0, true);
      } else if (lottieRef.current) {
        lottieRef.current.setSpeed(1.0);
        lottieRef.current.goToAndPlay(0, true);
      }

      // Retry brief interval right after transitioning to MORPH_TO_ICON to ensure Lottie starts
      // when SVG DOM finishes loading asynchronously on initial page refresh
      let retries = 0;
      const playRetryInterval = setInterval(() => {
        if (stateRef.current === 'MORPH_TO_ICON' && lottieRef.current) {
          if (!isDOMLoadedRef.current || retries === 0) {
            lottieRef.current.setSpeed(1.0);
            lottieRef.current.goToAndPlay(0, true);
          }
        }
        if (++retries >= 6 || isDOMLoadedRef.current) {
          clearInterval(playRetryInterval);
        }
      }, 40);

      // Safety fallback completion in case onComplete event is missed during browser tab refresh/backgrounding
      const durationSec = lottieRef.current?.getDuration(false) || 1.2;
      const fallbackMs = Math.max(1000, durationSec * 1000 + 400);
      const safetyCompleteTimeout = setTimeout(() => {
        if (stateRef.current === 'MORPH_TO_ICON') {
          handleLottieComplete();
        }
      }, fallbackMs);

      return () => {
        clearInterval(playRetryInterval);
        clearTimeout(safetyCompleteTimeout);
      };
    } else if (state === 'IDLE') {
      if (lottieRef.current) {
        lottieRef.current.stop();
      }
    }
  }, [state, handleLottieComplete]);

  // Lifecycle & run coordination (#6, #9, #10)
  useEffect(() => {
    if (staggerTimeoutRef.current) clearTimeout(staggerTimeoutRef.current);
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);

    if (lottieRef.current) {
      lottieRef.current.stop();
    }

    setState('IDLE');
    stateRef.current = 'IDLE';

    // On initial page load/refresh (runId === 1), the parent heading container in App.tsx
    // has an entrance animation (delay: 0.2s + duration: 0.7s). We add 800ms base delay
    // so the sequential wave starts right after the text becomes visible on page load (#9).
    // On hover restart (runId > 1), baseDelay is 0ms (#10).
    const baseDelay = runId === 1 ? 800 : 0;
    const delay = baseDelay + charIndex * 60;

    staggerTimeoutRef.current = setTimeout(() => {
      setState('MORPH_TO_ICON');
      stateRef.current = 'MORPH_TO_ICON';
    }, delay);

    return () => {
      if (staggerTimeoutRef.current) clearTimeout(staggerTimeoutRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
    };
  }, [runId, charIndex]);

  // Character wrapper with fixed width & height (#12, #13)
  return (
    <span className="relative inline-flex items-center justify-center align-middle select-none">
      {/* Invisible layout anchor to lock width & height permanently */}
      <span
        className="invisible pointer-events-none select-none flex items-center justify-center px-[0.03em]"
        style={{
          minWidth: item.char === 'I' ? '0.68em' : '1.12em',
          height: '1.08em',
        }}
      >
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
            : state === 'MORPH_TO_ICON' || state === 'HOLD'
            ? { opacity: 0, scale: 0.92 }
            : { opacity: 1, scale: 1 } // MORPH_TO_LETTER
        }
        transition={{
          opacity: {
            duration: state === 'MORPH_TO_ICON' ? 0.12 : state === 'MORPH_TO_LETTER' ? 0.25 : 0,
            ease: state === 'MORPH_TO_ICON' ? 'easeOut' : 'easeInOut',
          },
          scale: {
            duration: state === 'MORPH_TO_ICON' ? 0.18 : state === 'MORPH_TO_LETTER' ? 0.25 : 0,
            ease: state === 'MORPH_TO_ICON' ? 'easeOut' : 'easeInOut',
          },
        }}
      >
        {item.char}
      </motion.span>

      {/* Lottie Icon element (#8, #14, #17, #18, #19) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={false}
        animate={
          state === 'IDLE'
            ? { opacity: 0, scale: 0.92 }
            : state === 'MORPH_TO_ICON' || state === 'HOLD'
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 0.92 } // MORPH_TO_LETTER
        }
        transition={{
          duration: state === 'MORPH_TO_ICON' ? 0.18 : state === 'MORPH_TO_LETTER' ? 0.25 : 0,
          ease: state === 'MORPH_TO_ICON' ? 'easeOut' : 'easeInOut',
        }}
      >
        {/* Icon size ~90-95% of capital letter height (#14) */}
        <div className="w-[0.68em] h-[0.68em] flex items-center justify-center">
          <Lottie
            lottieRef={lottieRef}
            animationData={item.lottie}
            loop={false}
            autoplay={false}
            onDOMLoaded={handleDOMLoaded}
            onLoadedImages={handleDOMLoaded}
            onComplete={handleLottieComplete}
            style={{ width: '100%', height: '100%' }}
          />
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

  // Restart sequence on hover (#10)
  const handleMouseEnter = useCallback(() => {
    setRunId((prev) => prev + 1);
  }, []);

  return (
    <h1
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
