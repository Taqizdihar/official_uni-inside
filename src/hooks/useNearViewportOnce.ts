import { useEffect, useState, type RefObject } from 'react';

/**
 * Latches to `true` the first time an element comes within `rootMargin` of the
 * viewport, and never goes back.
 *
 * Used to decide when a lazy section may mount: the section must not be torn
 * down again when it scrolls away, or it would lose its state.
 */
export const useNearViewportOnce = <T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = '1500px 0px',
) => {
  const [hasApproached, setHasApproached] = useState(false);

  useEffect(() => {
    if (hasApproached) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setHasApproached(true);
    }, { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasApproached, ref, rootMargin]);

  return hasApproached;
};
