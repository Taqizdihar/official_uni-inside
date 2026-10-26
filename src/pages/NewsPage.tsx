import {useSecondaryContent} from '../public/secondaryPages';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Newspaper } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import { PUBLIC_API_BASE } from '../public/client';
import { isDesignPreviewRoute, useDesignPreviewNoIndex } from '../public/designPreview';
import { NewsImage } from './news/NewsImage';
import { newestFirst, newsDate, newsHref, newsLabel, previewCategories, previewNews, uniqueNews, type NewsArticle, type NewsCategory } from './news/newsModel';
import styles from './news/NewsEditorial.module.css';

const PAGE_SIZE = 9;

function usePublishedNews() {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [items, setItems] = useState<NewsArticle[] | null>(null);
  const [firstPage, setFirstPage] = useState<NewsArticle[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${PUBLIC_API_BASE}/news/categories`, { signal: controller.signal, credentials: 'omit' })
      .then((response) => { if (!response.ok) throw new Error('Categories unavailable'); return response.json(); })
      .then((result) => { if (Array.isArray(result.data)) setCategories(result.data); })
      .catch(() => { /* The archive remains usable without topic names. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (page === 1) { setLoading(true); setItems(null); setError(false); }
    else { setLoadingMore(true); setMoreError(false); }
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (categoryId !== null) query.set('categoryId', String(categoryId));
    fetch(`${PUBLIC_API_BASE}/news?${query}`, { signal: controller.signal, credentials: 'omit' })
      .then((response) => { if (!response.ok) throw new Error('News unavailable'); return response.json(); })
      .then((result) => {
        const next = Array.isArray(result.data) ? result.data as NewsArticle[] : [];
        setItems((current) => page === 1 ? uniqueNews(next) : uniqueNews([...(current ?? []), ...next]));
        if (categoryId === null && page === 1) setFirstPage(uniqueNews(next));
        setHasMore(typeof result.meta?.hasMore === 'boolean' ? result.meta.hasMore : next.length === PAGE_SIZE);
        setError(false);
        setMoreError(false);
      })
      .catch(() => { if (!controller.signal.aborted) { if (page === 1) setError(true); else setMoreError(true); } })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setLoadingMore(false); } });
    return () => controller.abort();
  }, [categoryId, page, retryKey]);

  const selectCategory = (id: number | null) => { if (id === categoryId) return; setCategoryId(id); setPage(1); setItems(null); setHasMore(false); };
  return { categoryId, categories, items, firstPage, page, hasMore, loading, loadingMore, error, moreError,
    selectCategory, loadMore: () => { if (!loadingMore && hasMore) setPage((current) => current + 1); }, retry: () => setRetryKey((current) => current + 1) };
}

function FeaturedStory({ article, categories, flagged, preview }: { article: NewsArticle; categories: NewsCategory[]; flagged: boolean; preview: boolean }) {
  const href = newsHref(article, preview);
  const date = newsDate(article.published_at);
  const label = newsLabel(article, categories);
  return <section className={`grid min-w-0 overflow-hidden bg-[#202121] text-white lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] ${styles.enterLater}`} aria-labelledby="featured-story-title">
    <div className="flex min-w-0 flex-col justify-between px-6 py-9 sm:px-10 sm:py-12 lg:min-h-[465px] lg:px-12">
      <div><p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]"><span className="h-px w-9 bg-[#f9d02d]" />{flagged ? 'Featured story' : 'Latest story'}</p><div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[.14em] text-white/55">{label && <span>{label}</span>}{label && date && <span aria-hidden="true">/</span>}{date && <time dateTime={article.published_at || undefined}>{date}</time>}</div><h2 id="featured-story-title" className="mt-4 max-w-[13ch] break-words text-[clamp(2.5rem,4.5vw,5.6rem)] font-black leading-[.98] tracking-[-.065em]">{article.title}</h2>{article.excerpt?.trim() && <p className="mt-5 max-w-[54ch] text-base leading-relaxed text-white/68 sm:text-lg">{article.excerpt}</p>}</div>
      {href && <Link to={href} className="mt-8 inline-flex min-h-11 w-fit items-center gap-3 border-b border-[#f9d02d] pb-1 text-sm font-extrabold text-white hover:text-[#f9d02d] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f9d02d]">Read story <ArrowUpRight size={18} aria-hidden="true" /></Link>}
    </div>
    {href ? <Link to={href} aria-label={`Read ${article.title}`} className="group relative block min-h-[245px] focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#f9d02d] lg:min-h-[465px]"><NewsImage image={article.image} alt={article.title} preview={preview} eager className="absolute inset-0 h-full w-full [&>img]:transition-transform [&>img]:duration-500 group-hover:[&>img]:scale-[1.025] motion-reduce:[&>img]:transition-none" /><span className="pointer-events-none absolute bottom-5 right-6 inline-flex items-center gap-1 bg-[#f9d02d] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#202121]">Open story <ArrowUpRight size={13} aria-hidden="true" /></span></Link>
      : <NewsImage image={article.image} alt={article.title} preview={preview} eager className="min-h-[245px] lg:min-h-[465px]" />}
  </section>;
}

function ArchiveCard({ article, categories, preview }: { article: NewsArticle; categories: NewsCategory[]; preview: boolean }) {
  const href = newsHref(article, preview);
  const label = newsLabel(article, categories);
  const date = newsDate(article.published_at);
  return <article className="group min-w-0 border-t border-[#202121]/20 pt-5">
    {href ? <Link to={href} aria-label={`Read ${article.title}`} className="block focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><NewsImage image={article.image} alt={article.title} preview={preview} className="aspect-[1.55] [&>img]:transition-transform [&>img]:duration-500 group-hover:[&>img]:scale-[1.025] motion-reduce:[&>img]:transition-none" /></Link>
      : <NewsImage image={article.image} alt={article.title} preview={preview} className="aspect-[1.55]" />}
    <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#202121]/55">{label && <span>{label}</span>}{label && date && <span aria-hidden="true">/</span>}{date && <time dateTime={article.published_at || undefined}>{date}</time>}</div>
    <h3 className="mt-3 break-words text-[clamp(1.4rem,2vw,2rem)] font-black leading-[1.12] tracking-[-.04em] text-[#202121]">{href ? <Link to={href} className="hover:underline hover:decoration-[#f9d02d] hover:decoration-4 hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">{article.title}</Link> : article.title}</h3>
    {article.excerpt?.trim() && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#202121]/65">{article.excerpt}</p>}
    {href && <Link to={href} className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#202121] underline decoration-[#202121]/35 underline-offset-4 hover:decoration-[#202121] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Read article <ArrowUpRight size={16} aria-hidden="true" /></Link>}
  </article>;
}

function LatestColumn({ articles, categories, preview, heading }: { articles: NewsArticle[]; categories: NewsCategory[]; preview: boolean; heading: string }) {
  if (!articles.length) return null;
  return <aside className="min-w-0 border-t-4 border-[#202121] pt-5" aria-labelledby="latest-news-heading"><h2 id="latest-news-heading" className="text-2xl font-black tracking-[-.04em] text-[#202121]">{heading}</h2><div className="mt-6 space-y-6">{articles.map((article) => { const href = newsHref(article, preview); const date = newsDate(article.published_at); const label = newsLabel(article, categories); return <article key={article.id} className="grid grid-cols-[88px_1fr] gap-4 border-t border-[#202121]/15 pt-4 sm:grid-cols-[104px_1fr] xl:grid-cols-[78px_1fr]"><NewsImage image={article.image} alt={article.title} preview={preview} className="aspect-square" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#202121]/50">{label}{label && date && ' / '}{date}</p><h3 className="mt-2 break-words text-sm font-extrabold leading-snug text-[#202121] sm:text-base">{href ? <Link to={href} className="hover:underline hover:decoration-[#f9d02d] hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">{article.title}</Link> : article.title}</h3></div></article>; })}</div></aside>;
}

function NewsContent({ articles, firstPage, categories, categoryId, onCategory, loading, loadingMore, error, moreError, hasMore, onMore, onRetry, preview }: {
  articles: NewsArticle[] | null; firstPage: NewsArticle[] | null; categories: NewsCategory[]; categoryId: number | null; onCategory: (id: number | null) => void;
  loading: boolean; loadingMore: boolean; error: boolean; moreError: boolean; hasMore: boolean; onMore: () => void; onRetry: () => void; preview: boolean;
}) {
  const content=useSecondaryContent('news');
  const featured = useMemo(() => { const ordered = newestFirst(firstPage ?? []); return ordered.find((item) => item.is_featured === true || Number(item.is_featured) === 1) ?? ordered[0]; }, [firstPage]);
  const activeItems = newestFirst(articles ?? []);
  const withoutFeatured = activeItems.filter((item) => String(item.id) !== String(featured?.id));
  const sidebarCount = categoryId === null && withoutFeatured.length >= 6 ? 3 : categoryId === null && withoutFeatured.length >= 3 ? 1 : 0;
  const latest = sidebarCount ? withoutFeatured.slice(0, sidebarCount) : [];
  const latestIds = new Set(latest.map((item) => String(item.id)));
  const archive = withoutFeatured.filter((item) => !latestIds.has(String(item.id)));
  const visibleCategories = preview ? categories.filter((item) => previewNews.some((article) => article.category_id === item.id)) : categories;
  return <StaticPageLayout activePage="NEWS">
    <section className="bg-[#f0f0f0] px-6 pb-9 pt-[134px] sm:px-10 lg:px-12"><div className="mx-auto max-w-[1480px]"><div className="flex flex-wrap items-center gap-4"><BackToLandingLink />{preview && <span role="status" className="border border-[#202121] bg-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#202121]">Design Preview — Sample Content</span>}</div><div className={`mt-9 flex flex-wrap items-end justify-between gap-5 ${styles.enter}`}><div><p className="text-xs font-extrabold uppercase tracking-[.19em] text-[#202121]/50">Uni-Inside / News</p><h1 className="mt-3 text-[clamp(3rem,5.6vw,6rem)] font-black leading-[.94] tracking-[-.07em] text-[#202121]">{preview?'Stories from the studio.':content.heading}</h1></div><p className="max-w-sm text-base leading-relaxed text-[#202121]/65">{preview?'News, ideas, and updates collected in one place.':content.description}</p></div></div></section>
    <div className="bg-[#f0f0f0] px-6 pb-20 sm:px-10 lg:px-12"><div className="mx-auto max-w-[1480px]">
      {featured && <FeaturedStory article={featured} categories={categories} flagged={featured.is_featured === true || Number(featured.is_featured) === 1} preview={preview} />}
      {loading && !featured && <div role="status" aria-label="Loading published news" className="grid gap-8 bg-[#202121] p-8 lg:grid-cols-2"><div className="space-y-5 py-10"><div className="h-4 w-1/3 bg-white/15 motion-safe:animate-pulse" /><div className="h-16 w-3/4 bg-white/15 motion-safe:animate-pulse" /><div className="h-5 w-full bg-white/15 motion-safe:animate-pulse" /></div><div className="aspect-[1.5] bg-white/10 motion-safe:animate-pulse" /><span className="sr-only">Loading published news…</span></div>}
      {error && !featured && <div role="status" className="grid gap-7 border-t border-[#202121]/20 py-14 lg:grid-cols-[90px_1fr_auto] lg:items-end"><Newspaper size={68} strokeWidth={1} className="text-[#202121]/25" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#202121]/50">Connection interrupted</p><h2 className="mt-2 text-3xl font-black text-[#202121]">The news archive is unavailable.</h2><p className="mt-3 text-[#202121]/65">We could not load the published articles. Please try again.</p></div><button type="button" onClick={onRetry} className="inline-flex min-h-12 w-fit items-center gap-2 bg-[#f9d02d] px-5 py-3 text-sm font-extrabold text-[#202121] hover:bg-[#ffe054] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry <ArrowRight size={17} /></button></div>}
      {!loading && !error && firstPage?.length === 0 && <div role="status" className="grid gap-7 border-t border-[#202121]/20 py-14 lg:grid-cols-[90px_1fr]"><span className="text-7xl font-black text-[#202121]/15" aria-hidden="true">00</span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#202121]/50">The archive / In preparation</p><h2 className="mt-2 text-3xl font-black text-[#202121]">No published stories yet.</h2><p className="mt-3 text-[#202121]/65">Stories will appear here as they are published.</p></div></div>}
      {firstPage && firstPage.length > 0 && <>
        <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-[#202121]/20 py-4" role="group" aria-label="Filter by topic"><span className="mr-4 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#202121]/50">Topics</span><button type="button" onClick={() => onCategory(null)} aria-pressed={categoryId === null} className={`min-h-10 border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${categoryId === null ? 'border-[#202121] bg-[#202121] text-white' : 'border-[#202121]/25 text-[#202121] hover:border-[#202121]'}`}>All</button>{visibleCategories.map((category) => <button type="button" key={category.id} onClick={() => onCategory(category.id)} aria-pressed={categoryId === category.id} className={`min-h-10 border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${categoryId === category.id ? 'border-[#202121] bg-[#202121] text-white' : 'border-[#202121]/25 text-[#202121] hover:border-[#202121]'}`}>{category.name}</button>)}</div>
        <div className={`mt-10 grid gap-10 ${latest.length ? 'xl:grid-cols-[minmax(0,1fr)_minmax(245px,.34fr)] xl:gap-14' : ''}`}><section className="min-w-0" aria-labelledby="news-archive-heading"><div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#202121]/50">The archive / {categoryId === null ? 'All topics' : visibleCategories.find((item) => item.id === categoryId)?.name || 'Selected topic'}</p><h2 id="news-archive-heading" className="mt-2 text-3xl font-black tracking-[-.05em] text-[#202121] sm:text-4xl">{preview?'More to explore':content.archive_heading}</h2></div>{articles && <p className="text-xs font-bold uppercase tracking-[.12em] text-[#202121]/50" aria-live="polite">{activeItems.length} {preview ? 'sample' : 'published'} {activeItems.length === 1 ? 'story' : 'stories'} loaded</p>}</div>
          {loading ? <div role="status" className="grid gap-6 sm:grid-cols-2"><div className="aspect-[1.55] bg-[#e0e0db] motion-safe:animate-pulse" /><div className="aspect-[1.55] bg-[#e0e0db] motion-safe:animate-pulse" /><span className="sr-only">Loading selected topic…</span></div>
            : error ? <div role="status" className="border-t border-[#202121]/20 py-10"><h3 className="text-2xl font-black text-[#202121]">This topic could not load.</h3><button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center gap-2 bg-[#f9d02d] px-5 py-2 text-sm font-bold text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry <ArrowRight size={16} /></button></div>
              : archive.length ? <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2">{archive.map((article) => <ArchiveCard key={article.id} article={article} categories={categories} preview={preview} />)}</div>
                : <div role="status" className="border-t border-[#202121]/20 py-10"><h3 className="text-2xl font-black text-[#202121]">{activeItems.length === 0 ? 'No stories in this topic.' : 'The story above is the only one here.'}</h3><p className="mt-3 text-[#202121]/65">{activeItems.length === 0 ? 'Choose another topic to continue reading.' : 'Explore another topic or return to all stories.'}</p></div>}
          {moreError && <p role="status" className="mt-8 text-sm text-[#202121]/70">More stories could not load. <button type="button" onClick={onRetry} className="font-bold underline underline-offset-4">Retry</button></p>}
          {hasMore && !error && <button type="button" onClick={moreError ? onRetry : onMore} disabled={loadingMore} className="mt-10 inline-flex min-h-12 items-center gap-3 border border-[#202121] bg-[#202121] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#f9d02d] hover:text-[#202121] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">{loadingMore ? 'Loading more stories…' : moreError ? 'Retry load more' : 'Load more stories'}<ArrowDown size={18} aria-hidden="true" /></button>}
        </section><LatestColumn articles={latest} categories={categories} preview={preview} heading={preview?'Latest News':content.sidebar_heading} /></div>
      </>}
    </div></div>
  </StaticPageLayout>;
}

function PublishedNews() {
  const news = usePublishedNews();
  return <NewsContent articles={news.items} firstPage={news.firstPage} categories={news.categories} categoryId={news.categoryId} onCategory={news.selectCategory} loading={news.loading} loadingMore={news.loadingMore} error={news.error} moreError={news.moreError} hasMore={news.hasMore} onMore={news.loadMore} onRetry={news.retry} preview={false} />;
}

export function NewsPage() {
  const location = useLocation();
  const preview = isDesignPreviewRoute(location.pathname, location.search);
  useDesignPreviewNoIndex(preview);
  const [previewCategory, setPreviewCategory] = useState<number | null>(null);
  const filtered = previewCategory === null ? previewNews : previewNews.filter((article) => article.category_id === previewCategory);
  return preview ? <NewsContent articles={filtered} firstPage={previewNews} categories={previewCategories} categoryId={previewCategory} onCategory={setPreviewCategory} loading={false} loadingMore={false} error={false} moreError={false} hasMore={false} onMore={() => {}} onRetry={() => {}} preview /> : <PublishedNews />;
}
