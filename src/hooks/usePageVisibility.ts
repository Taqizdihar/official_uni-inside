import { useSyncExternalStore } from 'react';

/**
 * One document-level `visibilitychange` listener for the whole application.
 *
 * Every component that needs to pause work while the tab is hidden subscribes
 * here instead of registering its own listener.
 */
const listeners = new Set<() => void>();
let isListening = false;
let snapshot = typeof document === 'undefined' ? true : !document.hidden;

const handleVisibilityChange = () => {
  const next = !document.hidden;
  if (next === snapshot) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!isListening) {
    isListening = true;
    snapshot = !document.hidden;
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && isListening) {
      isListening = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
};

const getSnapshot = () => snapshot;
const getServerSnapshot = () => true;

/** Subscribe to the shared page-visibility state. */
export const usePageVisibility = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Read the shared page-visibility state outside React. */
export const getPageVisibility = () => snapshot;

/** Observe the shared page-visibility state outside React. */
export const subscribeToPageVisibility = (listener: () => void) => subscribe(listener);
