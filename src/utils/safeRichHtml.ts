import DOMPurify from 'dompurify';

export function safeRichHtml(value: string) {
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  });
  const container = document.createElement('div');
  container.innerHTML = clean;
  container.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href') ?? '';
    const invalid = !href || href !== href.trim() || [...href].some(char => char.charCodeAt(0) < 32 || char === '\\') ||
      href.startsWith('//') || /\s/.test(href) ||
      (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^(https?:\/\/|mailto:)/i.test(href));
    if (invalid) link.removeAttribute('href');
    if (link.getAttribute('target') === '_blank') link.setAttribute('rel', 'noopener noreferrer');
  });
  return container.innerHTML;
}
