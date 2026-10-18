import { useEffect } from 'react';

const previewHosts = new Set(['localhost', '127.0.0.1', '::1', 'uni-inside.pages.dev']);

export function isDesignPreviewRoute(pathname: string, search: string, hostname = window.location.hostname) {
  if (!previewHosts.has(hostname.toLowerCase()) || new URLSearchParams(search).get('designPreview') !== '1') return false;
  return pathname === '/products' || pathname === '/products/design-preview'
    || pathname === '/services' || pathname === '/services/design-preview';
}

export function useDesignPreviewNoIndex(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    const previousRobots = robots.content;
    const previousTitle = document.title;
    robots.content = 'noindex, nofollow';
    const previewTitle = window.location.pathname.startsWith('/products')
      ? 'Design Preview — Uni-Inside Craft'
      : 'Design Preview — Uni-Inside Studio';
    document.title = previewTitle;
    return () => {
      if (created) robots?.remove();
      else if (robots) robots.content = previousRobots;
      if (document.title === previewTitle) document.title = previousTitle;
    };
  }, [active]);
}
