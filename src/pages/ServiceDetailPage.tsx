import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Clapperboard } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Link, useLocation, useParams } from 'react-router-dom';
import { StaticPageLayout } from '../components/StaticPageLayout';
import { trackEvent, usePublicContent, usePublicDetail } from '../public/client';
import { useDesignPreviewNoIndex } from '../public/designPreview';
import { StudioImage } from './StudioImage';
import { canShowStudioPreview, safeServiceHref, servicePrice, studioPreviewServices, type StudioImage as StudioImageData, type StudioService } from './studioService';
import styles from './StudioServices.module.css';

const safeHtml = (value: string) => DOMPurify.sanitize(value, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
});

function ServiceAction({ service, preview, light = false }: { service: StudioService; preview: boolean; light?: boolean }) {
  if (preview) return <p className={`border-l-4 border-[#f9d02d] pl-4 text-sm leading-relaxed ${light ? 'text-white/70' : 'text-[#202121]/65'}`}>Sample content only — enquiry actions are unavailable in design preview.</p>;
  const href = safeServiceHref(service.primary_cta_url);
  const label = service.primary_cta_label?.trim() || 'Discuss this service';
  const className = `inline-flex min-h-12 w-fit items-center justify-center gap-3 px-6 py-3 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 ${light ? 'bg-[#f9d02d] text-[#202121] hover:bg-[#ffe054] focus-visible:outline-white' : 'bg-[#202121] text-white hover:bg-[#353636] focus-visible:outline-[#202121]'}`;
  if (!href) return <Link to="/#contact-us" className={className}>Contact Uni-Inside Studio <ArrowUpRight size={18} aria-hidden="true" /></Link>;
  const action = () => trackEvent('cta_click', { linkDestination: href });
  if (href.startsWith('/')) return <Link to={href} onClick={action} className={className}>{label}<ArrowUpRight size={18} aria-hidden="true" /></Link>;
  const external = /^https?:/i.test(href);
  return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} onClick={action} className={className}>{label}<ArrowUpRight size={18} aria-hidden="true" /></a>;
}

function ServiceGallery({ service }: { service: StudioService }) {
  const [selected, setSelected] = useState(0);
  const images = useMemo(() => {
    const seen = new Set<string>();
    return [service.image, ...(Array.isArray(service.images) ? service.images : [])].filter((image): image is StudioImageData => {
      if (!image?.secure_url || seen.has(image.secure_url)) return false;
      seen.add(image.secure_url);
      return true;
    });
  }, [service]);
  useEffect(() => setSelected(0), [service.id, service.slug]);
  const active = images[selected] ?? images[0];
  const name = service.name || 'Studio service';
  const change = (direction: number) => setSelected((current) => (current + direction + images.length) % images.length);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length;
    setSelected(next);
    (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };
  return <div className="min-w-0">
    <div className="relative aspect-[1.23] overflow-hidden bg-[#d9d9d3] sm:aspect-[1.6] lg:aspect-[1.24]">
      <div className="pointer-events-none absolute inset-5 z-10 border border-[#202121]/15" aria-hidden="true" />
      <p className="pointer-events-none absolute left-8 top-8 z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#202121]/55"><span className="h-2 w-2 rounded-full bg-[#f9d02d]" />Studio / Visual reference</p>
      <StudioImage key={active?.secure_url || 'missing'} image={active} alt={`${name} visual reference ${selected + 1}`} eager className={`absolute inset-0 h-full w-full object-contain p-12 sm:p-16 ${styles.galleryEnter}`} />
      {images.length > 1 && <div className="absolute bottom-5 right-5 z-10 flex bg-[#202121] p-1 text-white"><button type="button" onClick={() => change(-1)} aria-label="Previous service image" className="grid h-11 w-11 place-items-center hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f9d02d]"><ChevronLeft size={21} /></button><button type="button" onClick={() => change(1)} aria-label="Next service image" className="grid h-11 w-11 place-items-center hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#f9d02d]"><ChevronRight size={21} /></button></div>}
    </div>
    {images.length > 1 && <><div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[.14em] text-white/55"><span aria-live="polite">{String(selected + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span><span>Select a visual</span></div><div className="mt-4 flex gap-3 overflow-x-auto pb-2" role="group" aria-label="Service image gallery">{images.map((image, index) => <button type="button" key={image.secure_url} aria-label={`Show service image ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} onKeyDown={(event) => onKeyDown(event, index)} className={`h-[76px] w-[76px] shrink-0 border-2 bg-[#d9d9d3] p-1 transition-colors hover:border-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${selected === index ? 'border-[#202121] ring-2 ring-[#f9d02d] ring-offset-2 ring-offset-[#202121]' : 'border-transparent'}`}><StudioImage image={image} alt={`${name} thumbnail ${index + 1}`} className="h-full w-full object-contain" /></button>)}</div></>}
      {!images.length && <p className="mt-3 text-xs text-white/55">No visual reference is published for this service.</p>}
  </div>;
}

const groupDetails = [
  { type: 'included', eyebrow: 'Within the service', title: 'What is included' },
  { type: 'deliverable', eyebrow: 'At handoff', title: 'Deliverables' },
  { type: 'requirement', eyebrow: 'From your side', title: 'What we need from you' },
  { type: 'not_included', eyebrow: 'Outside the scope', title: 'Not included' },
] as const;

function ServiceScope({ service }: { service: StudioService }) {
  const groups = groupDetails.map((group) => ({ ...group, items: (service.items ?? []).filter((item) => item?.item_type === group.type && item.label?.trim()) })).filter((group) => group.items.length);
  if (!groups.length) return null;
  return <section className="bg-[#f0f0f0] px-6 py-16 sm:px-10 lg:px-12 lg:py-20" aria-labelledby="service-scope-title"><div className="mx-auto max-w-[1480px]"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/50">01 / The scope</p><h2 id="service-scope-title" className="mt-3 text-[clamp(2.2rem,4vw,4.6rem)] font-black leading-none tracking-[-.06em] text-[#202121]">Clear from the start.</h2><div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">{groups.map((group) => <div key={group.type} className="border-t border-[#202121]/25 pt-5"><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#b09518]">{group.eyebrow}</p><h3 className="mt-2 text-2xl font-black tracking-tight text-[#202121]">{group.title}</h3><ul className="mt-5 space-y-3">{group.items.map((item, index) => <li key={`${item.label}-${index}`} className="flex gap-3 text-base leading-relaxed text-[#202121]/75"><span className="mt-[.6em] h-1.5 w-1.5 shrink-0 bg-[#f9d02d]" aria-hidden="true" />{item.label}</li>)}</ul></div>)}</div></div></section>;
}

function ServiceProcess({ service }: { service: StudioService }) {
  const steps = (service.processSteps ?? []).filter((step) => step?.title?.trim());
  if (!steps.length) return null;
  return <section className="bg-[#202121] px-6 py-16 text-white sm:px-10 lg:px-12 lg:py-20" aria-labelledby="service-process-title"><div className="mx-auto max-w-[1480px]"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]">02 / The process</p><h2 id="service-process-title" className="mt-3 text-[clamp(2.2rem,4vw,4.6rem)] font-black leading-none tracking-[-.06em]">How the work unfolds.</h2><ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">{steps.map((step, index) => <li key={`${step.title}-${index}`} className="min-w-0 border-t border-white/30 pt-5"><span className="text-sm font-bold text-[#f9d02d]">{String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span><h3 className="mt-6 break-words text-2xl font-black tracking-tight">{step.title}</h3>{step.description?.trim() && <p className="mt-3 text-base leading-relaxed text-white/70">{step.description}</p>}</li>)}</ol></div></section>;
}

function MoreServices({ current }: { current: StudioService }) {
  const { services } = usePublicContent();
  const seen = new Set<string>();
  const related = (services ?? []).filter((item) => {
    const key = String(item.id ?? item.slug ?? '');
    if (!key || seen.has(key) || !item.slug || item.slug === current.slug || String(item.id) === String(current.id)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3) as StudioService[];
  if (!related.length) return null;
  return <section className="bg-[#eee] px-6 py-16 sm:px-10 lg:px-12" aria-labelledby="more-services-title"><div className="mx-auto max-w-[1480px]"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/50">Continue exploring</p><h2 id="more-services-title" className="mt-2 text-3xl font-black tracking-tight text-[#202121] sm:text-4xl">More from the Studio</h2><div className="mt-8 grid gap-6 md:grid-cols-3">{related.map((item, index) => <Link key={item.id ?? item.slug} to={`/services/${encodeURIComponent(item.slug!)}`} className="group border-t border-[#202121]/25 pt-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><span className="text-xs font-bold text-[#b09518]">/ {String(index + 1).padStart(2, '0')}</span><span className="mt-3 flex items-center justify-between gap-3 text-xl font-black text-[#202121] group-hover:underline group-hover:decoration-[#f9d02d] group-hover:underline-offset-4">{item.name}<ArrowUpRight size={19} aria-hidden="true" /></span>{item.short_description && <span className="mt-3 block text-sm leading-relaxed text-[#202121]/65">{item.short_description}</span>}</Link>)}</div></div></section>;
}

function ServiceContent({ service, preview }: { service: StudioService; preview: boolean }) {
  const price = servicePrice(service);
  const listHref = preview ? '/services?designPreview=1' : '/services';
  return <StaticPageLayout activePage="SERVICES">
    <section className="bg-[#202121] px-6 pb-16 pt-[138px] text-white sm:px-10 lg:px-12 lg:pb-20"><div className="mx-auto max-w-[1480px]">
      {preview && <div role="status" className="mb-6 w-fit border border-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#f9d02d]">Design Preview — Sample Content</div>}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-white/55"><Link to="/" className="hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9d02d]">Home</Link><span aria-hidden="true">/</span><Link to={listHref} className="hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f9d02d]">Services</Link><span aria-hidden="true">/</span><span aria-current="page" className="max-w-full truncate text-white">{service.name || 'Studio service'}</span></nav>
      <div className="mt-10 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
        <div className={styles.enter}><p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]"><span className="h-px w-10 bg-[#f9d02d]" />Uni-Inside Studio / Service</p><h1 className="mt-5 max-w-[16ch] break-words text-[clamp(3.2rem,6.3vw,7.3rem)] font-black leading-[.92] tracking-[-.07em]">{service.name || 'Studio service'}</h1>{service.short_description?.trim() && <p className="mt-7 max-w-[55ch] text-lg leading-relaxed text-white/75 sm:text-xl">{service.short_description}</p>}
          {(price.value || service.estimated_duration?.trim()) && <dl className="mt-8 grid gap-5 border-t border-white/25 pt-6 sm:grid-cols-2">{price.value && <div><dt className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">{price.label}</dt><dd className="mt-2 text-lg font-bold text-white">{price.value}</dd>{price.note && <dd className="mt-1 text-sm leading-relaxed text-white/60">{price.note}</dd>}</div>}{service.estimated_duration?.trim() && <div><dt className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Estimated duration</dt><dd className="mt-2 text-lg font-bold text-white">{service.estimated_duration}</dd></div>}</dl>}
          <div className="mt-8"><ServiceAction service={service} preview={preview} light /></div>
        </div><div className={styles.enterLater}><ServiceGallery service={service} /></div>
      </div>
    </div></section>
    {service.description?.trim() && <section className="bg-white px-6 py-16 sm:px-10 lg:px-12 lg:py-20"><div className="mx-auto grid max-w-[1480px] gap-8 lg:grid-cols-[minmax(0,.55fr)_minmax(0,1fr)] lg:gap-16"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/50">The Studio / In detail</p><h2 className="mt-3 text-[clamp(2.2rem,4vw,4.5rem)] font-black leading-none tracking-[-.06em] text-[#202121]">A closer look.</h2></div><div className={styles.richText} dangerouslySetInnerHTML={{ __html: safeHtml(service.description) }} /></div></section>}
    <ServiceScope service={service} />
    <ServiceProcess service={service} />
    {!preview && <MoreServices current={service} />}
    <section className="bg-[#f9d02d] px-6 py-16 sm:px-10 lg:px-12"><div className="mx-auto grid max-w-[1480px] gap-7 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/60">Next / The conversation</p><h2 className="mt-3 max-w-[20ch] text-[clamp(2rem,3.6vw,4rem)] font-black leading-[1.03] tracking-[-.055em] text-[#202121]">Tell us about your brief.</h2><p className="mt-4 max-w-[60ch] text-[#202121]/70">Share what you hope to make and what matters most. We can take the conversation from there.</p></div><ServiceAction service={service} preview={preview} /></div></section>
    <div className="bg-[#202121] px-6 py-8 sm:px-10 lg:px-12"><div className="mx-auto max-w-[1480px]"><Link to={listHref} className="inline-flex items-center gap-2 text-sm font-bold text-white underline underline-offset-4 hover:text-[#f9d02d] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f9d02d]"><ArrowLeft size={17} aria-hidden="true" /> Back to services</Link></div></div>
  </StaticPageLayout>;
}

function ServiceState({ state, retry }: { state: 'loading' | 'not-found' | 'offline'; retry?: () => void }) {
  return <StaticPageLayout activePage="SERVICES"><section className="min-h-[70vh] bg-[#f0f0f0] px-6 pb-20 pt-[158px] sm:px-10 lg:px-12"><div className="mx-auto max-w-[1480px]"><Link to="/services" className="inline-flex items-center gap-2 text-sm font-bold text-[#202121] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><ArrowLeft size={16} aria-hidden="true" /> Back to services</Link>{state === 'loading' ? <div role="status" aria-label="Loading service details" className="mt-10 grid gap-10 lg:grid-cols-2"><div className="space-y-5 pt-4"><div className="h-3 w-1/4 bg-[#deded9] motion-safe:animate-pulse" /><div className="h-16 w-3/4 bg-[#deded9] motion-safe:animate-pulse" /><div className="h-5 w-full bg-[#deded9] motion-safe:animate-pulse" /></div><div className="aspect-[1.4] bg-[#deded9] motion-safe:animate-pulse" /><span className="sr-only">Loading service details…</span></div> : <div role="status" className="mt-14 grid gap-8 border-t border-[#202121]/20 pt-10 lg:grid-cols-[100px_1fr]"><Clapperboard size={72} strokeWidth={1} className="text-[#202121]/25" aria-hidden="true" /><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/50">{state === 'not-found' ? 'Service not found' : 'Connection interrupted'}</p><h1 className="mt-2 max-w-[18ch] text-[clamp(2.5rem,5vw,5rem)] font-black leading-none tracking-tight text-[#202121]">{state === 'not-found' ? 'This service is not published here.' : 'We cannot load this service right now.'}</h1><p className="mt-5 max-w-xl text-[#202121]/70">{state === 'not-found' ? 'It may be unpublished or the address may have changed.' : 'Please check your connection and try again.'}</p>{state === 'offline' && <button type="button" onClick={retry} className="mt-7 inline-flex min-h-12 items-center gap-2 bg-[#f9d02d] px-6 py-3 text-sm font-extrabold text-[#202121] hover:bg-[#ffe054] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry <ArrowRight size={16} aria-hidden="true" /></button>}</div></div>}</div></section></StaticPageLayout>;
}

function PublishedServiceDetail({ slug }: { slug: string }) {
  const { data, loading, notFound, offline, retry } = usePublicDetail('services', slug);
  useEffect(() => {
    if (!data) return;
    const priorTitle = document.title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const priorDescription = meta?.content;
    document.title = String(data.meta_title || `${data.name} | Uni-Inside`);
    if (meta) meta.content = String(data.meta_description || data.short_description || '');
    const id = Number(data.id);
    if (Number.isFinite(id)) trackEvent('service_view', { entityType: 'service', entityId: id });
    return () => { document.title = priorTitle; if (meta && priorDescription !== undefined) meta.content = priorDescription; };
  }, [data]);
  if (loading && !data) return <ServiceState state="loading" />;
  if (notFound) return <ServiceState state="not-found" />;
  if (offline) return <ServiceState state="offline" retry={retry} />;
  if (!data) return <ServiceState state="loading" />;
  return <ServiceContent service={data as StudioService} preview={false} />;
}

export function ServiceDetailPage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const preview = slug === 'design-preview' && canShowStudioPreview(location.pathname, location.search);
  useDesignPreviewNoIndex(preview);
  if (!preview) return <PublishedServiceDetail slug={slug} />;
  const sampleValue = Number(new URLSearchParams(location.search).get('sample') || 1);
  const index = Number.isFinite(sampleValue) ? Math.max(0, Math.min(studioPreviewServices.length - 1, sampleValue - 1)) : 0;
  return <ServiceContent key={index} service={studioPreviewServices[index]} preview />;
}
