import sanitizeHtml from 'sanitize-html';

/** The CMS and public page support only editorial text markup, never embeds. */
export function sanitizeNewsBody(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tag, attributes) => ({ tagName: 'a', attribs: {
        ...(attributes.href && !attributes.href.startsWith('//') && !/[\s\\]/.test(attributes.href) && (/^https?:\/\//i.test(attributes.href) || /^mailto:/i.test(attributes.href) || /^\/(?!\/)/.test(attributes.href)) ? { href: attributes.href } : {}),
        ...(attributes.title ? { title: attributes.title } : {}),
        rel: 'noopener noreferrer',
      } }),
    },
  });
}

export function readableNewsText(html: string) {
  const separated = html.replace(/<\/?(?:p|div|li|h[1-6]|blockquote|br)\b[^>]*>/gi, ' ');
  return sanitizeHtml(separated, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

/** Editorial estimate: 200 readable words per minute, capped by the form's 999-minute limit. */
export function suggestedNewsMinutes(html: string) {
  const text = readableNewsText(html);
  return text ? Math.min(999, Math.max(1, Math.ceil(text.split(/\s+/u).length / 200))) : null;
}
