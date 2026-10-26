import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { StaticPageLayout } from '../components/StaticPageLayout';
import { PUBLIC_API_BASE, trackEvent, usePublicContent, usePublicDetail } from '../public/client';
import { isDesignPreviewRoute, useDesignPreviewNoIndex } from '../public/designPreview';
import { NewsImage } from './news/NewsImage';
import { newestFirst, newsCategory, newsDate, newsFormat, newsHref, newsLabel, previewCategories, previewNews, readingTime, safeNewsHtml, uniqueNews, type NewsArticle, type NewsCategory } from './news/newsModel';
import styles from './news/NewsEditorial.module.css';

function usePublishedCategories() {
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${PUBLIC_API_BASE}/news/categories`, { signal: controller.signal, credentials: 'omit' })
      .then((response) => { if (!response.ok) throw new Error('Categories unavailable'); return response.json(); })
      .then((result) => { if (Array.isArray(result.data)) setCategories(result.data); })
      .catch(() => { /* Format remains available if topic names cannot load. */ });
    return () => controller.abort();
  }, []);
  return categories;
}

function RelatedStories({ articles, categories, preview }: { articles: NewsArticle[]; categories: NewsCategory[]; preview: boolean }) {
  if (!articles.length) return null;
  return <aside className="min-w-0 border-t-4 border-[#202121] pt-5" aria-labelledby="more-to-read-heading">
    <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#202121]/50">Keep reading</p>
    <h2 id="more-to-read-heading" className="mt-2 text-2xl font-black tracking-[-.04em] text-[#202121]">More to read</h2>
    <div className="mt-6 space-y-6">{articles.map((article) => {
      const href = newsHref(article, preview);
      const date = newsDate(article.published_at);
      const label = newsLabel(article, categories);
      return <article key={article.id} className="border-t border-[#202121]/20 pt-5">
        {href && <Link to={href} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]" aria-label={`Read ${article.title}`}><NewsImage image={article.image} alt={article.title} preview={preview} className="aspect-[1.7]" /></Link>}
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[.12em] text-[#202121]/55">{label}{label && date && ' / '}{date}</p>
        <h3 className="mt-2 break-words text-lg font-black leading-tight tracking-[-.03em] text-[#202121]">{href ? <Link to={href} className="hover:underline hover:decoration-[#f9d02d] hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">{article.title}</Link> : article.title}</h3>
      </article>;
    })}</div>
  </aside>;
}

function ArticleView({ article, categories, related, preview }: { article: NewsArticle; categories: NewsCategory[]; related: NewsArticle[]; preview: boolean }) {
  const date = newsDate(article.published_at);
  const label = newsLabel(article, categories);
  const category = newsCategory(article, categories)?.name;
  const format = newsFormat(article.content_type);
  const duration = readingTime(article.reading_time_minutes);
  const author = article.author_name?.trim();
  const gallery = (article.images ?? []).filter((image, index, images) => image.secure_url && image.secure_url !== article.image?.secure_url && images.findIndex((candidate) => candidate.secure_url === image.secure_url) === index);
  const html = article.body?.trim() ? safeNewsHtml(article.body) : '';
  return <StaticPageLayout activePage="NEWS">
    <div className="bg-[#f0f0f0] px-6 pb-24 pt-[136px] sm:px-10 lg:px-12">
      <div className="mx-auto max-w-[1380px]">
        {preview && <p role="status" className="mb-7 w-fit border border-[#202121] bg-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#202121]">Design Preview — Sample Content</p>}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-[.12em] text-[#202121]/55"><Link to="/" className="hover:text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">Home</Link><span aria-hidden="true">/</span><Link to={preview ? '/news?designPreview=1' : '/news'} className="hover:text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">News</Link><span aria-hidden="true">/</span><span className="max-w-full truncate text-[#202121]" aria-current="page">{article.title}</span></nav>
        <header className={`mt-12 max-w-[1060px] ${styles.enter}`}>
          {(label || format) && <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/60"><span className="h-px w-10 bg-[#d5aa12]" />{category || label}{format && category && <><span aria-hidden="true">/</span><span>{format}</span></>}</p>}
          <h1 className="mt-5 break-words text-[clamp(3.1rem,7.5vw,7.4rem)] font-black leading-[.95] tracking-[-.07em] text-[#202121]">{article.title}</h1>
          {article.excerpt?.trim() && <p className="mt-7 max-w-[800px] text-[clamp(1.2rem,2vw,1.65rem)] leading-[1.5] text-[#202121]/70">{article.excerpt}</p>}
          {(date || author || duration) && <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#202121]/25 pt-5 text-xs font-bold uppercase tracking-[.14em] text-[#202121]/55">{date && <time dateTime={article.published_at || undefined}>{date}</time>}{date && (author || duration) && <span aria-hidden="true">/</span>}{author && <span>By {author}</span>}{author && duration && <span aria-hidden="true">/</span>}{duration && <span>{duration}</span>}</div>}
        </header>
        {article.image?.secure_url ? <figure className={`mt-12 ${styles.enterLater}`}><NewsImage image={article.image} alt={article.title} preview={preview} eager className="aspect-[1.65] max-h-[690px] w-full" />{article.image.caption?.trim() && <figcaption className="mt-3 text-sm text-[#202121]/60">{article.image.caption}</figcaption>}</figure>
          : <div className="mt-12 border-t border-[#202121]/25" aria-hidden="true" />}
        <div className="mt-14 grid gap-16 xl:grid-cols-[minmax(0,760px)_minmax(245px,320px)] xl:justify-between xl:gap-20">
          <div className="min-w-0">
            {html && <div className={`${styles.richText} max-w-[760px]`} dangerouslySetInnerHTML={{ __html: html }} />}
            {gallery.length > 0 && <section className="mt-16 space-y-10" aria-label="Article gallery">{gallery.map((image, index) => <figure key={`${image.secure_url}-${index}`}><img src={image.secure_url} alt={image.alt_text || `${article.title}, additional image ${index + 1}`} width={image.width_px || 1000} height={image.height_px || 700} loading="lazy" decoding="async" className="max-h-[700px] w-full bg-[#deded9] object-contain" />{image.caption?.trim() && <figcaption className="mt-3 text-sm leading-relaxed text-[#202121]/60">{image.caption}</figcaption>}</figure>)}</section>}
            <Link to={preview ? '/news?designPreview=1' : '/news'} className="mt-16 inline-flex min-h-12 items-center gap-3 border-b border-[#202121] pb-1 text-sm font-extrabold text-[#202121] hover:text-[#947100] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><ArrowLeft size={18} aria-hidden="true" /> Back to News</Link>
          </div>
          <RelatedStories articles={related} categories={categories} preview={preview} />
        </div>
      </div>
    </div>
  </StaticPageLayout>;
}

function ArticleState({ kind, retry, preview }: { kind: 'loading' | 'not-found' | 'offline'; retry?: () => void; preview: boolean }) {
  const title = kind === 'loading' ? 'Loading article…' : kind === 'not-found' ? 'Article not found.' : 'The article is unavailable.';
  return <StaticPageLayout activePage="NEWS"><div className="min-h-[65vh] bg-[#f0f0f0] px-6 pb-20 pt-[160px] sm:px-10 lg:px-12"><div className="mx-auto max-w-[1380px]">{preview && <p role="status" className="mb-8 w-fit bg-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase text-[#202121]">Design Preview — Sample Content</p>}<p className="text-xs font-bold uppercase tracking-[.16em] text-[#202121]/50">Uni-Inside / News</p><h1 role="status" className="mt-5 break-words text-[clamp(2.5rem,5vw,5rem)] font-black tracking-[-.06em] text-[#202121]">{title}</h1>{kind === 'not-found' && <p className="mt-5 text-lg text-[#202121]/65">This article may not be published, or the link may have changed.</p>}{kind === 'offline' && <p className="mt-5 text-lg text-[#202121]/65">We could not reach the published article. Please try again.</p>}<div className="mt-9 flex flex-wrap gap-6">{kind === 'offline' && retry && <button type="button" onClick={retry} className="min-h-12 bg-[#f9d02d] px-6 py-3 text-sm font-extrabold text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry</button>}<Link to={preview ? '/news?designPreview=1' : '/news'} className="inline-flex min-h-12 items-center gap-2 border-b border-[#202121] text-sm font-extrabold text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Back to News <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div></div></StaticPageLayout>;
}

function PublishedNewsDetail({ slug }: { slug: string }) {
  const { data, loading, notFound, offline, retry } = usePublicDetail('news', slug);
  const { news } = usePublicContent();
  const categories = usePublishedCategories();
  const article = data as NewsArticle | null;
  const related = useMemo(() => {
    if (!article || !news) return [];
    const candidates = uniqueNews(newestFirst(news as NewsArticle[])).filter((item) => String(item.id) !== String(article.id) && item.slug !== article.slug);
    return candidates.sort((a, b) => Number(b.category_id === article.category_id && article.category_id != null) - Number(a.category_id === article.category_id && article.category_id != null)).slice(0, 3);
  }, [article, news]);
  useEffect(() => {
    if (!article) return;
    document.title = String(article.meta_title || `${article.title} | Uni-Inside`);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    const previous = meta.content;
    meta.content = String(article.meta_description || article.excerpt || '');
    trackEvent('news_view', { entityType: 'news', entityId: Number(article.id) });
    return () => { if (created) meta?.remove(); else if (meta) meta.content = previous; };
  }, [article]);
  if (loading) return <ArticleState kind="loading" preview={false} />;
  if (notFound) return <ArticleState kind="not-found" preview={false} />;
  if (offline) return <ArticleState kind="offline" preview={false} retry={retry} />;
  return article ? <ArticleView article={article} categories={categories} related={related} preview={false} /> : <ArticleState kind="not-found" preview={false} />;
}

export function NewsDetailPage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const preview = isDesignPreviewRoute(location.pathname, location.search) && slug === 'design-preview';
  useDesignPreviewNoIndex(preview);
  if (!preview) return <PublishedNewsDetail slug={slug} />;
  const sample = new URLSearchParams(location.search).get('sample') || '1';
  const article = previewNews.find((item) => String(item.id) === sample);
  if (!article) return <ArticleState kind="not-found" preview />;
  const related = previewNews.filter((item) => item.id !== article.id).sort((a, b) => Number(b.category_id === article.category_id && article.category_id != null) - Number(a.category_id === article.category_id && article.category_id != null)).slice(0, 3);
  return <ArticleView article={article} categories={previewCategories} related={related} preview />;
}
