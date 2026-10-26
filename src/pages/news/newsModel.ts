import DOMPurify from 'dompurify';
import camera from '../../assets/about-us/elements/camera.avif';
import cameraman from '../../assets/our-services/Cameraman.avif';
import droneman from '../../assets/our-services/Droneman.avif';

export type NewsCategory = { id: number; name: string; slug: string };
export type NewsImageData = { secure_url: string; alt_text?: string | null; caption?: string | null; width_px?: number | null; height_px?: number | null };
export type NewsArticle = {
  id: number | string;
  slug?: string;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  published_at?: string | null;
  is_featured?: boolean | number;
  category_id?: number | null;
  category_name?: string | null;
  content_type?: 'news' | 'article' | 'update' | 'event' | null;
  reading_time_minutes?: number | null;
  author_name?: string | null;
  image?: NewsImageData | null;
  images?: NewsImageData[] | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

export const newsDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};
export const readingTime = (value?: number | null) => Number.isInteger(Number(value)) && Number(value) > 0 ? `${value} min read` : null;
export const newsCategory = (article: NewsArticle, categories: NewsCategory[]) => categories.find((category) => category.id === Number(article.category_id)) ?? (article.category_name ? { id: Number(article.category_id), name: article.category_name, slug: '' } : null);
export const newsFormat = (value?: NewsArticle['content_type']) => value ? ({ news: 'News', article: 'Article', update: 'Update', event: 'Event' })[value] : null;
export const newsLabel = (article: NewsArticle, categories: NewsCategory[]) => newsCategory(article, categories)?.name || newsFormat(article.content_type);
export const newsListLabel = (article: NewsArticle, categories: NewsCategory[]) => {
  const category = newsCategory(article, categories)?.name;
  const format = newsFormat(article.content_type);
  return category && format && category.toLowerCase() !== format.toLowerCase() ? `${category} / ${format}` : category || format;
};
export const newsHref = (article: NewsArticle, preview: boolean) => preview
  ? `/news/design-preview?designPreview=1&sample=${article.id}`
  : article.slug ? `/news/${encodeURIComponent(article.slug)}` : null;
export const newestFirst = (articles: NewsArticle[]) => [...articles].sort((a, b) => {
  const difference = (Date.parse(b.published_at || '') || 0) - (Date.parse(a.published_at || '') || 0);
  return difference || Number(b.id) - Number(a.id) || 0;
});
export function uniqueNews(articles: NewsArticle[]) {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = String(article.id ?? article.slug ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function safeNewsHtml(raw: string) {
  const cleaned = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  });
  const template = document.createElement('template');
  template.innerHTML = cleaned;
  for (const link of template.content.querySelectorAll('a')) {
    const href = link.getAttribute('href') || '';
    if (/^\/(?!\/)/.test(href)) { link.removeAttribute('target'); link.removeAttribute('rel'); continue; }
    try {
      const url = new URL(href);
      if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) throw new Error('Unsafe link');
      if (url.protocol !== 'mailto:') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      else { link.removeAttribute('target'); link.removeAttribute('rel'); }
    } catch { link.removeAttribute('href'); link.removeAttribute('target'); link.removeAttribute('rel'); }
  }
  return template.innerHTML;
}

// These are illustration-led editorial samples for the explicit preview only.
export const previewCategories: NewsCategory[] = [
  { id: 1, name: 'Creative Process', slug: 'creative-process' },
  { id: 2, name: 'Studio Practice', slug: 'studio-practice' },
];
export const previewNews: NewsArticle[] = [
  {
    id: 1, slug: 'design-preview', title: 'How an idea finds its frame',
    excerpt: 'An illustrative long-form story showing how a visual thought can take shape on an editorial page.',
    body: '<p>This is sample editorial content for layout review. It does not describe an actual Uni-Inside project, event, or client.</p><p>A strong story begins with a useful question. The page needs room for the answer to develop through context, images, and clear pauses between ideas. This paragraph demonstrates the reading width and rhythm used for longer published articles.</p><h2>Finding the point of view</h2><p>The design study uses a sequence of short paragraphs and visual references to show how a reader can move through a longer piece without losing the thread. All factual details on a real page will come from its published CMS record.</p><blockquote>Sample quotation for editorial layout review, not a statement from a client or team member.</blockquote><h3>What the page supports</h3><ul><li>A clear introduction.</li><li>Readable headings and lists.</li><li>Images with captions when provided.</li></ul><p>This final sample paragraph shows the transition from the story into related reading. It contains no claim about completed work.</p>',
    published_at: '2026-10-01T09:00:00Z', is_featured: true, category_id: 1, content_type: 'article', reading_time_minutes: 4,
    image: { secure_url: camera, alt_text: 'Illustrative camera artwork for preview' },
    images: [
      { secure_url: cameraman, alt_text: 'Illustrative camera operator artwork', caption: 'Sample caption: an illustration used for layout review.' },
      { secure_url: droneman, alt_text: 'Illustrative aerial operator artwork', caption: 'Sample caption: a second visual reference.' },
    ],
  },
  {
    id: 2, slug: 'design-preview', title: 'A note without a cover image',
    excerpt: 'A sparse sample showing how a short update reads without photography or extra metadata.',
    body: '<p>This short sample is intentionally spare. It demonstrates the no-image and minimal-metadata presentation only.</p>',
    published_at: '2026-09-21T09:00:00Z', content_type: 'update',
  },
  {
    id: 3, slug: 'design-preview', title: 'The space between frames',
    excerpt: 'A sample archive story used to review card hierarchy and the topic navigation.',
    body: '<p>This illustrative story exists only to show how an archive card connects to a short reading page. It does not report actual studio work.</p>',
    published_at: '2026-09-08T09:00:00Z', category_id: 2, content_type: 'article',
    image: { secure_url: cameraman, alt_text: 'Illustrative camera operator artwork' },
  },
  {
    id: 4, slug: 'design-preview', title: 'Notes from a visual study',
    excerpt: 'An illustrative second archive entry for reviewing the compact latest-story treatment.',
    body: '<p>This is sample copy for the News design preview. Published articles use their own CMS text and images.</p>',
    published_at: '2026-08-27T09:00:00Z', category_id: 1, content_type: 'news',
    image: { secure_url: droneman, alt_text: 'Illustrative aerial operator artwork' },
  },
];
