import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {cleanProductHtml} from '../public/productRichText';
import {PurchasePlatformIcon} from '../components/PurchasePlatformIcon';
import { StaticPageLayout } from '../components/StaticPageLayout';
import { trackEvent, usePublicContent, usePublicDetail } from '../public/client';
import { CraftImage } from './CraftImage';
import { canShowCraftPreview, craftPreviewDetail, craftPreviewItems, formatPriceAdjustment, formatProductPrice, productTypeLabel, safePurchaseHref, useCraftPreviewNoIndex, type CraftImage as CraftImageType, type CraftProduct } from './craftProduct';
import styles from './CraftProducts.module.css';

const safeHtml=cleanProductHtml;

function ProductGallery({ product }: { product: CraftProduct }) {
  const [selected, setSelected] = useState(0);
  const images = useMemo(() => {
    const unique = new Set<string>();
    return [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter((image): image is CraftImageType => {
      if (!image?.secure_url || unique.has(image.secure_url)) return false;
      unique.add(image.secure_url);
      return true;
    });
  }, [product]);
  useEffect(() => setSelected(0), [product.id, product.slug]);
  const active = images[selected] ?? images[0];
  const name = product.name?.trim() || 'Craft object';
  const step = (direction: number) => setSelected((current) => (current + direction + images.length) % images.length);
  const onThumbnailKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length;
    setSelected(next);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return <div className="min-w-0">
    <div className="relative aspect-[1.12] overflow-hidden border border-[#202121]/10 bg-[#e5e5e0] sm:aspect-[1.2]">
      <div className="pointer-events-none absolute inset-5 border border-[#202121]/10" aria-hidden="true" />
      <span className="absolute left-6 top-6 z-10 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#202121]/55">Uni-Inside Craft / Object view</span>
      <CraftImage key={active?.secure_url || 'missing'} src={active?.secure_url} alt={active?.alt_text || `${name} — image ${selected + 1}`} width={active?.width_px} height={active?.height_px} loading="eager" className={`absolute inset-0 h-full w-full object-contain p-10 sm:p-14 ${styles.imageEnter}`} />
      {images.length > 1 && <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1 bg-[#202121] p-1 text-white">
        <button type="button" onClick={() => step(-1)} aria-label="Previous product image" className="grid h-10 w-10 place-items-center hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f9d02d]"><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" onClick={() => step(1)} aria-label="Next product image" className="grid h-10 w-10 place-items-center hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f9d02d]"><ChevronRight size={20} aria-hidden="true" /></button>
      </div>}
    </div>
    <div className="mt-4 flex items-start justify-between gap-4"><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#202121]/60" aria-live="polite">{images.length ? `${String(selected + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}` : 'Image unavailable'}</p><p className="text-right text-xs text-[#202121]/55">{images.length > 1 ? 'Select a view below' : 'Object image'}</p></div>
    {images.length > 1 && <div className="mt-4 flex gap-3 overflow-x-auto pb-2" role="group" aria-label="Product image gallery">
      {images.map((image, index) => <button key={image.secure_url} type="button" aria-label={`Show product image ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} onKeyDown={(event) => onThumbnailKeyDown(event, index)} className={`relative h-[78px] w-[78px] shrink-0 border-2 bg-[#e5e5e0] p-1 transition-colors hover:border-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${selected === index ? 'border-[#202121] ring-2 ring-[#f9d02d] ring-offset-2' : 'border-transparent'}`}><CraftImage src={image.secure_url} alt={image.alt_text || `${name} thumbnail ${index + 1}`} width={image.width_px} height={image.height_px} className="h-full w-full object-contain" /></button>)}
    </div>}
  </div>;
}

function ProductPurchase({ product, preview }: { product: CraftProduct; preview: boolean }) {
  const links = !preview && Array.isArray(product.purchaseLinks)
    ? product.purchaseLinks.map((link) => ({ ...link, href: safePurchaseHref(link.url) })).filter((link) => link.href !== null).sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)))
    : [];
  if (preview) return <div className="border-l-4 border-[#f9d02d] bg-white p-5 text-sm leading-relaxed text-[#202121]/75">Purchase actions are unavailable in this sample preview. Published products will show their real store or contact links here.</div>;
  if (!links.length) return <div className="border-t border-[#202121]/20 pt-6"><p className="text-sm text-[#202121]/65">Purchase links are not listed for this object.</p><Link to="/#contact-us" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#202121] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Ask about this object <ArrowUpRight size={16} aria-hidden="true" /></Link></div>;
  return <div className="border-t border-[#202121]/20 pt-6"><p className="mb-3 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/55">Purchase or enquire</p><div className="flex flex-wrap gap-2">
    {links.map((link, index) => <a key={link.id} href={link.href!} target={/^https?:\/\//i.test(link.href!) ? '_blank' : undefined} rel={/^https?:\/\//i.test(link.href!) ? 'noopener noreferrer' : undefined} onClick={() => trackEvent('product_purchase_link_click', { entityType: 'product', entityId: Number(product.id), linkDestination: link.href! })} aria-label={link.button_label?.trim() || link.store_name} title={link.store_name} className={`inline-flex min-h-12 min-w-12 items-center justify-center px-3 py-3 text-sm font-extrabold transition-colors active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121] motion-reduce:transition-none ${index === 0 ? 'bg-[#f9d02d] text-[#202121] hover:bg-[#ffe054]' : 'border border-[#202121]/45 bg-transparent text-[#202121] hover:border-[#202121]'}`}><PurchasePlatformIcon platform={link.store_name} size={23}/></a>)}
  </div></div>;
}

function ProductInformation({ product, preview }: { product: CraftProduct; preview: boolean }) {
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const colors = Array.isArray(product.colors) ? product.colors.filter((color) => color?.name) : [];
  const variants = Array.isArray(product.variants) ? product.variants.filter((variant) => variant?.name) : [];
  const price = formatProductPrice(product.base_price, product.currency_code);
  const type = productTypeLabel(product.product_type);
  const quantity = Number(product.minimum_order_quantity);
  return <div className={`min-w-0 ${styles.revealLate}`}>
    {type && <p className="w-fit border-l-4 border-[#f9d02d] pl-3 text-xs font-extrabold uppercase tracking-[.16em] text-[#202121]/65">{type}</p>}
    <h1 className="mt-5 max-w-[18ch] break-words text-[clamp(2.5rem,4.5vw,5.7rem)] font-black leading-[.98] tracking-[-.065em] text-[#202121]">{product.name || 'Craft object'}</h1>
    {product.short_description?.trim() && <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[#202121]/70 sm:text-lg">{product.short_description}</p>}
    {(price || product.price_note?.trim()) && <div className="mt-7 border-y border-[#202121]/20 py-5"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#202121]/55">{price ? preview ? 'Sample base price' : 'Base price' : 'Pricing'}</p>{price && <p className="mt-1 text-[clamp(1.7rem,2.3vw,2.5rem)] font-black tracking-[-.045em] text-[#202121]">{price}</p>}{product.price_note?.trim() && <p className="mt-1 text-sm leading-relaxed text-[#202121]/65">{product.price_note}</p>}</div>}
    {(product.availability_label || product.lead_time_text || (Number.isFinite(quantity) && quantity > 0)) && <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">{product.availability_label && <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/50">Availability</dt><dd className="mt-1 text-sm font-semibold text-[#202121]">{product.availability_label}</dd></div>}{product.lead_time_text && <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/50">Lead time</dt><dd className="mt-1 text-sm font-semibold text-[#202121]">{product.lead_time_text}</dd></div>}{Number.isFinite(quantity) && quantity > 0 && <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/50">Minimum order</dt><dd className="mt-1 text-sm font-semibold text-[#202121]">{quantity}</dd></div>}</dl>}
    <div className="mt-7"><ProductPurchase product={product} preview={preview} /></div>
    {colors.length > 0 && <section className="mt-7"><h2 className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/55">Available colors</h2><div className="mt-3 flex flex-wrap gap-2">{colors.map((color, index) => { const validHex = /^#[\da-f]{6}$/i.test(color.hex_color ?? ''); return <button key={`${color.name}-${index}`} type="button" aria-pressed={selectedColor === index} onClick={() => setSelectedColor(index)} className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-semibold text-[#202121] transition-colors hover:border-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${selectedColor === index ? 'border-[#202121] bg-white' : 'border-[#202121]/20 bg-transparent'}`}><span className={`h-4 w-4 rounded-full border border-[#202121]/20 ${validHex ? '' : 'bg-[repeating-linear-gradient(45deg,#ddd,#ddd_3px,#fff_3px,#fff_6px)]'}`} style={validHex ? { backgroundColor: color.hex_color! } : undefined} aria-hidden="true" />{color.name}</button>; })}</div>{selectedColor !== null && <p className="mt-2 text-xs text-[#202121]/55">{colors[selectedColor]?.name} selected for reference. Confirm the color with the store or maker.</p>}</section>}
    {variants.length > 0 && <section className="mt-7"><h2 className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#202121]/55">Available options</h2><ul className="mt-2 divide-y divide-[#202121]/15 border-y border-[#202121]/15">{variants.map((variant, index) => { const adjustment = formatPriceAdjustment(variant.price_adjustment, product.currency_code); return <li key={`${variant.name}-${index}`} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm text-[#202121]"><span>{variant.name}</span>{adjustment && <span className="font-semibold">{adjustment}</span>}</li>; })}</ul><p className="mt-2 text-xs text-[#202121]/55">Options are for reference; final selection and price are confirmed with the store or maker.</p></section>}
  </div>;
}

function RelatedProducts({ current }: { current: CraftProduct }) {
  const { products } = usePublicContent();
  const seen = new Set<string>();
  const related = (products ?? []).filter((item) => {
    const key = String(item.id ?? item.slug ?? '');
    if (!key || seen.has(key) || String(item.id) === String(current.id) || item.slug === current.slug || !item.slug) return false;
    seen.add(key);
    return true;
  }).slice(0, 3) as CraftProduct[];
  if (!related.length) return null;
  return <section className="bg-[#ededeb] px-6 py-16 sm:px-10 lg:px-12" aria-labelledby="more-craft-heading"><div className="mx-auto max-w-[1480px]"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/55">Continue exploring</p><h2 id="more-craft-heading" className="mt-2 text-3xl font-black tracking-tight text-[#202121] sm:text-4xl">More from Uni-Inside Craft</h2><div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <Link key={item.id ?? item.slug} to={`/products/${encodeURIComponent(item.slug!)}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><div className="relative aspect-[1.4] overflow-hidden bg-[#e3e3dd]"><CraftImage src={item.image?.secure_url} alt={item.image?.alt_text || item.name || 'Craft object'} className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transition-none" /></div><span className="mt-3 flex items-center justify-between gap-2 text-lg font-extrabold text-[#202121]">{item.name}<ArrowUpRight size={18} aria-hidden="true" /></span></Link>)}</div></div></section>;
}

function ProductContent({ product, preview }: { product: CraftProduct; preview: boolean }) {
  const features = Array.isArray(product.features) ? product.features.filter((feature) => feature?.label && feature?.value_text) : [];
  const catalogueHref = preview ? '/products?designPreview=1' : '/products';
  return <StaticPageLayout activePage="PRODUCTS">
    <section className="bg-[#f0f0f0] px-6 pb-16 pt-[150px] sm:px-10 lg:px-12 lg:pb-20"><div className="mx-auto max-w-[1480px]">
      {preview && <div className="mb-6 w-fit border border-[#202121] bg-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#202121]" role="status">Design Preview — Sample Content</div>}
      <nav aria-label="Breadcrumb" className="mb-9 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#202121]/55"><Link to="/" className="hover:text-[#202121] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">Home</Link><span aria-hidden="true">/</span><Link to={catalogueHref} className="hover:text-[#202121] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">Products</Link><span aria-hidden="true">/</span><span className="max-w-full truncate text-[#202121]" aria-current="page">{product.name || 'Craft object'}</span></nav>
      <div className="grid gap-9 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:gap-14 xl:gap-20"><ProductGallery product={product} /><ProductInformation product={product} preview={preview} /></div>
    </div></section>
    {(product.description?.trim() || features.length > 0) && <section className="bg-white px-6 py-16 sm:px-10 lg:px-12 lg:py-20"><div className="mx-auto grid max-w-[1480px] gap-12 lg:grid-cols-2 lg:gap-20">{product.description?.trim() && <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/55">The object / story</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#202121] sm:text-4xl">A closer look</h2><div className={`mt-6 ${styles.richText}`} dangerouslySetInnerHTML={{ __html: safeHtml(product.description) }} /></div>}{features.length > 0 && <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/55">Details / from the maker</p><h2 className="mt-3 text-3xl font-black tracking-tight text-[#202121] sm:text-4xl">Specifications</h2><dl className="mt-6 border-t border-[#202121]/20">{features.map((feature, index) => <div key={`${feature.label}-${index}`} className="grid gap-2 border-b border-[#202121]/15 py-4 sm:grid-cols-[minmax(130px,.4fr)_1fr]"><dt className="text-sm font-bold text-[#202121]">{feature.label}</dt><dd className="text-sm leading-relaxed text-[#202121]/70">{feature.value_text}</dd></div>)}</dl></div>}</div></section>}
    {!preview && <RelatedProducts current={product} />}
    <section className="bg-[#202121] px-6 py-12 text-white sm:px-10 lg:px-12"><div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-5"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]">Uni-Inside Craft</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Keep exploring the collection.</h2></div><Link to={catalogueHref} className="inline-flex items-center gap-2 border border-white/70 px-5 py-3 text-sm font-bold transition-colors hover:bg-white hover:text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f9d02d]"><ArrowLeft size={17} aria-hidden="true" /> Back to products</Link></div></section>
  </StaticPageLayout>;
}

function ProductState({ state, retry, preview }: { state: 'loading' | 'not-found' | 'offline'; retry?: () => void; preview?: boolean }) {
  return <StaticPageLayout activePage="PRODUCTS"><section className="min-h-[70vh] bg-[#f0f0f0] px-6 pb-20 pt-[160px] sm:px-10 lg:px-12"><div className="mx-auto max-w-[1480px]"><Link to={preview ? '/products?designPreview=1' : '/products'} className="inline-flex items-center gap-2 text-sm font-bold text-[#202121] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><ArrowLeft size={16} aria-hidden="true" /> Back to products</Link>
    {state === 'loading' ? <div role="status" aria-label="Loading product details" className="mt-10 grid gap-10 lg:grid-cols-2"><div className="aspect-[1.12] bg-[#e3e3df] motion-safe:animate-pulse" /><div className="space-y-5 pt-4"><div className="h-3 w-1/4 bg-[#e3e3df] motion-safe:animate-pulse" /><div className="h-16 w-3/4 bg-[#e3e3df] motion-safe:animate-pulse" /><div className="h-5 w-full bg-[#e3e3df] motion-safe:animate-pulse" /><div className="h-5 w-2/3 bg-[#e3e3df] motion-safe:animate-pulse" /></div><span className="sr-only">Loading product details…</span></div>
      : <div role="status" className="mt-14 grid gap-8 border-t border-[#202121]/20 pt-10 lg:grid-cols-[120px_1fr]"><Box size={76} strokeWidth={1} className="text-[#202121]/25" aria-hidden="true" /><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/50">{state === 'not-found' ? 'Object not found' : 'Connection interrupted'}</p><h1 className="mt-2 max-w-[18ch] text-[clamp(2.5rem,5vw,5rem)] font-black leading-none tracking-tight text-[#202121]">{state === 'not-found' ? 'This object is not in the gallery.' : 'We cannot load this object right now.'}</h1><p className="mt-5 max-w-xl text-[#202121]/70">{state === 'not-found' ? 'It may be unpublished or the address may have changed.' : 'Please check your connection and try again.'}</p>{state === 'offline' && <button type="button" onClick={retry} className="mt-7 inline-flex items-center gap-2 bg-[#f9d02d] px-6 py-3 text-sm font-extrabold text-[#202121] hover:bg-[#ffe054] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry <ArrowRight size={16} aria-hidden="true" /></button>}</div></div>}
  </div></section></StaticPageLayout>;
}

function RealProductDetail({ slug }: { slug: string }) {
  const { data, loading, notFound, offline, retry } = usePublicDetail('products', slug);
  useEffect(() => {
    if (!data) return;
    document.title = String(data.meta_title || `${data.name} | Uni-Inside`);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = String(data.meta_description || data.short_description || '');
    const id = Number(data.id);
    if (Number.isFinite(id)) trackEvent('product_view', { entityType: 'product', entityId: id });
    return () => { document.title = 'Official Uni-Inside'; };
  }, [data]);
  if (loading && !data) return <ProductState state="loading" />;
  if (notFound) return <ProductState state="not-found" />;
  if (offline) return <ProductState state="offline" retry={retry} />;
  if (!data) return <ProductState state="loading" />;
  return <ProductContent product={data as CraftProduct} preview={false} />;
}

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const preview = slug === 'design-preview' && canShowCraftPreview(location.search);
  useCraftPreviewNoIndex(preview);
  if (!preview) return <RealProductDetail slug={slug} />;
  const params = new URLSearchParams(location.search);
  const sampleIndex = Math.max(0, Math.min(craftPreviewItems.length - 1, Number(params.get('sample') || 1) - 1));
  const sample = craftPreviewItems[sampleIndex] ?? craftPreviewItems[0];
  const single = params.get('gallery') === 'single';
  const product = { ...craftPreviewDetail, ...sample, images: single || sampleIndex === 1 ? [] : craftPreviewDetail.images };
  return <ProductContent key={`${sampleIndex}-${single}`} product={product} preview />;
}
