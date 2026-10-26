import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import craftLogo from '../assets/global/Uni-Inside Craft White.avif';
import {useSecondaryContent} from '../public/secondaryPages';
import { usePublicList } from '../public/client';
import { CraftImage } from './CraftImage';
import { canShowCraftPreview, craftPreviewItems, formatProductPrice, productTypeLabel, useCraftPreviewNoIndex, type CraftProduct } from './craftProduct';
import styles from './CraftProducts.module.css';

type CatalogueProps = { products: CraftProduct[] | null; loading: boolean; error: boolean; retry?: () => void; preview: boolean };

function PublishedProductsPage() {
  const { data, loading, error, retry } = usePublicList('products');
  return <Catalogue products={data as CraftProduct[] | null} loading={loading} error={error} retry={retry} preview={false} />;
}

function ProductCard({ product, index, preview }: { product: CraftProduct; index: number; preview: boolean }) {
  const name = product.name?.trim() || 'Untitled object';
  const type = productTypeLabel(product.product_type);
  const price = formatProductPrice(product.base_price, product.currency_code) || product.price_note?.trim();
  const href = preview ? `/products/design-preview?designPreview=1&sample=${index + 1}` : product.slug ? `/products/${encodeURIComponent(product.slug)}` : null;
  const image = <CraftImage src={product.image?.secure_url} alt={product.image?.alt_text || name} width={product.image?.width_px} height={product.image?.height_px} loading={index < 3 ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full object-contain p-8 transition-transform duration-500 ease-out motion-reduce:transition-none group-hover:scale-[1.035] sm:p-10" />;
  return <article className={`group flex min-w-0 flex-col ${styles.revealLate}`} style={{ animationDelay: `${Math.min(index, 5) * 65}ms` }}>
    <div className="relative aspect-[1.16] overflow-hidden border border-[#202121]/10 bg-[#e5e5e0]">
      <span className="pointer-events-none absolute left-5 top-5 z-10 text-[11px] font-bold tracking-[.18em] text-[#202121]/65">OBJECT {String(index + 1).padStart(2, '0')}</span>
      {type && <span className="pointer-events-none absolute right-4 top-4 z-10 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#202121]">{type}</span>}
      {href ? <Link to={href} aria-label={`View details for ${name}`} className="absolute inset-0 block focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#f9d02d]">{image}</Link> : image}
    </div>
    <div className="flex flex-1 flex-col border-t border-[#202121]/20 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className="min-w-0 max-w-full break-words text-xl font-extrabold leading-tight tracking-[-.035em] text-[#202121] sm:text-2xl">{href ? <Link to={href} className="hover:underline hover:decoration-[#f9d02d] hover:decoration-4 hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#202121]">{name}</Link> : name}</h3>{price && <p className="max-w-full text-sm font-bold text-[#202121]/75">{price}</p>}</div>
      {product.short_description?.trim() && <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-[#202121]/65">{product.short_description}</p>}
      {product.price_note?.trim() && formatProductPrice(product.base_price, product.currency_code) && <p className="mt-2 max-w-[46ch] text-xs leading-relaxed text-[#202121]/55">{product.price_note}</p>}
      {href && <Link to={href} className="mt-auto inline-flex w-fit items-center gap-2 pt-5 text-xs font-extrabold uppercase tracking-[.12em] text-[#202121] underline decoration-[#202121]/25 underline-offset-4 transition-colors hover:decoration-[#202121] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#202121]">View details <ArrowUpRight size={16} aria-hidden="true" /></Link>}
    </div>
  </article>;
}

function Catalogue({ products, loading, error, retry, preview }: CatalogueProps) {
  const content=useSecondaryContent('products');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ready_made' | 'custom' | 'both'>('all');
  const [sort, setSort] = useState<'default' | 'name'>('default');
  const collection = products ?? [];
  const visibleProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('en');
    const matching = collection.filter((product) => (typeFilter === 'all' || product.product_type === typeFilter || typeFilter !== 'both' && product.product_type === 'both') && (!term || `${product.name ?? ''} ${product.short_description ?? ''}`.toLocaleLowerCase('en').includes(term)));
    return sort === 'name' ? matching.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'en')) : matching;
  }, [collection, query, typeFilter, sort]);
  const heroProduct = collection.find((product) => product.image?.secure_url);
  const heroImage = !preview && content.banner_media_url ? { secure_url: content.banner_media_url, alt_text: content.banner_media_alt } : heroProduct?.image ?? (preview ? craftPreviewItems[1].image : null);
  const isInitialLoading = !preview && loading && products === null && !error;

  return <StaticPageLayout activePage="PRODUCTS">
    <section className="bg-[#202121] px-6 pb-10 pt-[132px] text-white sm:px-10 lg:px-12 lg:pb-12 lg:pt-[138px]"><div className="mx-auto max-w-[1480px]">
      <div className="flex flex-wrap items-center gap-4"><BackToLandingLink />{preview && <div className="w-fit border border-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#f9d02d]" role="status">Design Preview — Sample Content</div>}</div>
      <div className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:gap-14">
        <div className={styles.reveal}>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[.18em] text-[#f9d02d]"><img src={craftLogo} alt="Uni-Inside Craft" width="54" height="60" className="h-12 w-auto object-contain" /><span className="h-px w-10 bg-[#f9d02d]/70" aria-hidden="true" /><span>Uni-Inside Craft / 3D objects</span></div>
          <h1 className="mt-4 max-w-[11ch] text-[clamp(3.2rem,5.1vw,5.9rem)] font-black leading-[.94] tracking-[-.07em]">{preview?'Objects made':content.heading} <span className="text-[#f9d02d]">{preview?'to be held.':content.accent}</span></h1>
          <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-white/75 sm:text-lg">{preview?'Explore ready-made pieces and custom 3D-printed creations from our workshop. Each published object has its own details and a direct path to the maker or store.':content.description}</p>
        </div>
        <div className={`relative hidden h-[280px] overflow-hidden border border-white/15 bg-[#303230] lg:block ${styles.revealLate}`}>
          <span className="absolute left-5 top-5 z-10 text-[10px] font-bold uppercase tracking-[.2em] text-white/65">The object / 01</span><div className="absolute inset-x-7 bottom-14 top-12 border border-white/10" aria-hidden="true" />
          {heroImage ? <CraftImage src={heroImage.secure_url} alt={heroImage.alt_text || 'Craft object artwork'} width={'width_px' in heroImage ? heroImage.width_px : undefined} height={'height_px' in heroImage ? heroImage.height_px : undefined} loading="eager" className="relative z-0 h-full w-full object-contain p-9" /> : <p className="relative z-0 grid h-full place-items-center px-10 text-center text-sm text-white/60">Published objects will appear here.</p>}
          {heroImage && <p className="absolute bottom-4 left-5 right-5 z-10 border-t border-white/20 pt-3 text-[11px] font-medium text-white/70">{preview ? 'Illustrative workshop visual — not a published listing' : content.banner_media_url ? 'From the Uni-Inside Craft collection' : heroProduct?.name}</p>}
        </div>
      </div>
    </div></section>

    <section className="bg-[#f0f0f0] px-6 pb-20 pt-7 sm:px-10 lg:px-12 lg:pb-24" aria-labelledby="craft-catalogue-heading"><div className="mx-auto max-w-[1480px]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#202121]/25 pb-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#202121]/55">The collection / 3D printed objects</p><h2 id="craft-catalogue-heading" className="mt-2 text-[clamp(2rem,3.4vw,3.6rem)] font-black leading-none tracking-[-.055em] text-[#202121]">{preview?'Browse the objects':content.listing_heading}</h2></div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#202121]/60" aria-live="polite">{error ? 'Collection unavailable' : isInitialLoading ? 'Checking the collection' : collection.length ? `${visibleProducts.length} of ${collection.length} ${preview ? 'sample objects loaded' : 'published objects loaded · up to 60 shown'}` : '0 published objects loaded'}</p></div>
      {!error && !isInitialLoading && collection.length > 0 && <div className="grid gap-3 border-b border-[#202121]/15 py-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto] lg:items-end lg:gap-6">
        <label className="relative block max-w-md"><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/60">Search loaded objects</span><Search size={18} className="pointer-events-none absolute bottom-[13px] left-3 text-[#202121]/50" aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or description" className="w-full border border-[#202121]/25 bg-white py-2.5 pl-10 pr-3 text-sm text-[#202121] outline-none transition-colors placeholder:text-[#202121]/40 focus:border-[#202121] focus-visible:ring-2 focus-visible:ring-[#f9d02d]" /></label>
        <div role="group" aria-label="Filter by product type"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/60">Product type</p><div className="flex flex-wrap gap-1.5">{([['all', 'All'], ['ready_made', 'Ready-made'], ['custom', 'Custom'], ['both', 'Both']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTypeFilter(value)} aria-pressed={typeFilter === value} className={`border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${typeFilter === value ? 'border-[#202121] bg-[#202121] text-white' : 'border-[#202121]/25 bg-transparent text-[#202121] hover:border-[#202121]'}`}>{label}</button>)}</div></div>
        <label className="block min-w-[150px]"><span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/60">Sort loaded objects</span><select value={sort} onChange={(event) => setSort(event.target.value as 'default' | 'name')} className="w-full border border-[#202121]/25 bg-white px-3 py-2.5 text-xs font-bold text-[#202121] outline-none focus:border-[#202121] focus-visible:ring-2 focus-visible:ring-[#f9d02d]"><option value="default">Collection order</option><option value="name">Name A–Z</option></select></label>
      </div>}

      {isInitialLoading ? <div role="status" aria-label="Loading published products" className="grid gap-7 pt-8 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="motion-safe:animate-pulse"><div className="aspect-[1.16] bg-[#e3e3df]" /><div className="mt-5 h-6 w-2/3 bg-[#e3e3df]" /><div className="mt-3 h-4 w-4/5 bg-[#e3e3df]" /></div>)}<span className="sr-only">Loading published products…</span></div>
        : error ? <div className="grid gap-7 border-b border-[#202121]/20 py-14 lg:grid-cols-[120px_1fr_auto] lg:items-end" role="status"><span className="text-[clamp(4rem,9vw,8rem)] font-black leading-none tracking-[-.09em] text-[#202121]/15" aria-hidden="true">?</span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#202121]/55">Connection interrupted</p><h3 className="mt-2 text-3xl font-black tracking-tight text-[#202121]">The collection is unavailable.</h3><p className="mt-3 max-w-xl text-[#202121]/65">We could not load the published objects. Please try again shortly.</p></div><button type="button" onClick={retry} className="inline-flex w-fit items-center gap-2 bg-[#f9d02d] px-5 py-3 text-sm font-extrabold text-[#202121] transition-colors hover:bg-[#ffe054] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry <ArrowRight size={17} aria-hidden="true" /></button></div>
        : collection.length === 0 ? <div className="grid gap-7 border-b border-[#202121]/20 py-14 lg:grid-cols-[120px_1fr_auto] lg:items-end" role="status"><span className="text-[clamp(4rem,9vw,8rem)] font-black leading-none tracking-[-.09em] text-[#202121]/15" aria-hidden="true">00</span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#202121]/55">The collection / in preparation</p><h3 className="mt-2 text-3xl font-black tracking-tight text-[#202121]">No published objects yet.</h3><p className="mt-3 max-w-xl text-[#202121]/65">The gallery will grow as products are published. Have a custom idea? We would be glad to discuss it.</p></div><Link to="/#contact-us" className="inline-flex w-fit items-center gap-2 border border-[#202121] px-5 py-3 text-sm font-extrabold text-[#202121] transition-colors hover:bg-[#202121] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Discuss an idea <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        : visibleProducts.length === 0 ? <div className="border-b border-[#202121]/20 py-14" role="status"><h3 className="text-3xl font-black tracking-tight text-[#202121]">No objects match this view.</h3><p className="mt-3 text-[#202121]/65">Try a different name or product type in the loaded collection.</p><button type="button" onClick={() => { setQuery(''); setTypeFilter('all'); }} className="mt-6 border-b-2 border-[#202121] pb-1 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Clear search and filters</button></div>
        : <div className="grid gap-x-7 gap-y-14 pt-6 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product, index) => <ProductCard key={product.id ?? product.slug ?? index} product={product} index={index} preview={preview} />)}</div>}
    </div></section>

    <section className="bg-[#202121] px-6 py-14 text-white sm:px-10 lg:px-12 lg:py-20"><div className="mx-auto grid max-w-[1480px] gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]">A thought becomes an object</p><h2 className="mt-3 max-w-[18ch] text-[clamp(2rem,4vw,4rem)] font-black leading-[1.05] tracking-[-.055em]">{preview?'Have something particular in mind?':content.cta_heading}</h2><p className="mt-5 max-w-[63ch] text-base leading-relaxed text-white/70">{preview?'Tell us about your idea for a custom 3D-printed piece. We can discuss the shape, purpose, and next steps together.':content.cta_description}</p></div><Link to={content.cta_url} className="inline-flex w-fit items-center gap-3 bg-[#f9d02d] px-6 py-4 text-sm font-extrabold text-[#202121] transition-colors hover:bg-[#ffe054] active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white motion-reduce:transition-none">{content.cta_label} <ArrowUpRight size={18} aria-hidden="true" /></Link></div></section>
  </StaticPageLayout>;
}

export function ProductsPage() {
  const location = useLocation();
  const preview = canShowCraftPreview(location.search);
  useCraftPreviewNoIndex(preview);
  return preview ? <Catalogue key="preview" products={craftPreviewItems} loading={false} error={false} preview /> : <PublishedProductsPage />;
}
