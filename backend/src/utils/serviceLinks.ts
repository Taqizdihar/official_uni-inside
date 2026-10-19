export function safeServiceCtaHref(raw: string) {
  if (!raw || raw !== raw.trim() || [...raw].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '\\') || raw.startsWith('//')) return false;
  if (/^\/(?!\/)/.test(raw)) return !/\s/.test(raw);
  if (/^mailto:[^\s@]+@[^\s@]+(?:\?[^\s]*)?$/i.test(raw)) return true;
  if (/^tel:\+?[\d(). -]+$/i.test(raw)) return /\d/.test(raw.slice(4));
  if (/\s/.test(raw)) return false;
  if (!/^https?:\/\//i.test(raw)) return false;
  try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
