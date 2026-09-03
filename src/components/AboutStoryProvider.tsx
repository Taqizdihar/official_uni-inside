import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type AboutStoryStage =
  | 'waiting'
  | 'camera'
  | 'flash'
  | 'camera-after-flash'
  | 'camera-exit'
  | 'polaroids-entering'
  | 'settled';

type AboutStoryContextValue = {
  stage: AboutStoryStage;
  prepare: () => Promise<void>;
  start: () => void;
  settle: () => void;
  finishCameraExit: () => void;
  finishPolaroidEntrance: () => void;
};

const AboutStoryContext = createContext<AboutStoryContextValue | null>(null);

const cameraSources = [
  new URL('../assets/about-us/elements/camera.avif', import.meta.url).href,
  new URL('../assets/about-us/elements/camera-flash.avif', import.meta.url).href,
];

const decodeImage = (source: string) => new Promise<void>((resolve) => {
  const image = new Image();
  image.onload = () => {
    if ('decode' in image) {
      image.decode().catch(() => undefined).finally(resolve);
    } else {
      resolve();
    }
  };
  image.onerror = () => resolve();
  image.src = source;
});

/**
 * Document-lifetime owner for the camera sequence. It intentionally sits above
 * route content so browser Back never creates a second entrance sequence.
 */
export const AboutStoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stage, setStage] = useState<AboutStoryStage>('waiting');
  const stageRef = useRef(stage);
  const preparedRef = useRef<Promise<void> | null>(null);
  const frameRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  const prepare = useCallback(() => {
    if (!preparedRef.current) preparedRef.current = Promise.all(cameraSources.map(decodeImage)).then(() => undefined);
    return preparedRef.current;
  }, []);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startedAt = performance.now();
    let flashShown = false;
    let afterFlashShown = false;
    setStage('camera');

    const advance = (now: number) => {
      const elapsed = now - startedAt;
      if (elapsed >= 1000) {
        setStage('camera-exit');
        frameRef.current = null;
        return;
      }
      if (elapsed >= 650 && !afterFlashShown) {
        afterFlashShown = true;
        setStage('camera-after-flash');
      } else if (elapsed >= 180 && !flashShown) {
        flashShown = true;
        setStage('flash');
      }
      frameRef.current = window.requestAnimationFrame(advance);
    };
    frameRef.current = window.requestAnimationFrame(advance);
  }, []);

  const settle = useCallback(() => {
    startedRef.current = true;
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setStage('settled');
  }, []);

  const finishCameraExit = useCallback(() => {
    if (stageRef.current === 'camera-exit') setStage('polaroids-entering');
  }, []);

  const finishPolaroidEntrance = useCallback(() => {
    if (stageRef.current === 'polaroids-entering') setStage('settled');
  }, []);

  const value = useMemo(() => ({ stage, prepare, start, settle, finishCameraExit, finishPolaroidEntrance }), [finishCameraExit, finishPolaroidEntrance, prepare, settle, stage, start]);
  return <AboutStoryContext.Provider value={value}>{children}</AboutStoryContext.Provider>;
};

export const useAboutStory = () => {
  const context = useContext(AboutStoryContext);
  if (!context) throw new Error('AboutStoryProvider is unavailable.');
  return context;
};
