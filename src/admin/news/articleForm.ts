import DOMPurify from 'dompurify';
import type { Photo } from '../products/model';

/** Match the API's 200 readable words/minute convention. */
export function suggestedArticleMinutes(html: string) {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'], ALLOWED_ATTR: [] });
  const container = document.createElement('div');
  container.innerHTML = clean.replace(/<\/?(?:p|div|li|h[1-6]|blockquote|br)\b[^>]*>/gi, ' ');
  const words = (container.textContent ?? '').trim().split(/\s+/u).filter(Boolean).length;
  return words ? Math.min(999, Math.max(1, Math.ceil(words / 200))) : null;
}

export function validReadingMinutes(value: string) {
  const number = Number(value);
  return /^\d+$/.test(value.trim()) && Number.isInteger(number) && number >= 1 && number <= 999;
}

export function moveArticleImage(images: Photo[], from: number, to: number) {
  if (from < 0 || from >= images.length || to < 0 || to >= images.length || from === to) return images;
  const next = [...images];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
