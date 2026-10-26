import { ArrowDown, ArrowRight, ArrowUpRight, Clapperboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import {useSecondaryContent} from '../public/secondaryPages';
import { usePublicList } from '../public/client';
import { useDesignPreviewNoIndex } from '../public/designPreview';
import { StudioImage } from './StudioImage';
import { canShowStudioPreview, studioPreviewServices, type StudioService } from './studioService';
import styles from './StudioServices.module.css';

function PublishedServices() {
  const { data, loading, error, retry } = usePublicList('services');
  return <ServicesContent services={data as StudioService[] | null} loading={loading} error={error} retry={retry} preview={false} />;
}

function ServiceEntry({ service, index, preview }: { service: StudioService; index: number; preview: boolean }) {
  const name = service.name?.trim() || 'Studio service';
  const href = preview ? `/services/design-preview?designPreview=1&sample=${index + 1}` : service.slug ? `/services/${encodeURIComponent(service.slug)}` : null;
  return <article className={`grid min-w-0 border-t border-[#202121]/20 py-10 lg:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)] lg:items-center lg:gap-16 lg:py-14 ${styles.enterLater}`}>
    <div className={`relative min-w-0 ${index % 2 ? 'lg:order-2' : ''}`}>
      <div className="relative aspect-[1.35] overflow-hidden bg-[#dcdcd6] sm:aspect-[1.65]">
        <div className="pointer-events-none absolute inset-5 z-10 border border-[#202121]/15" aria-hidden="true" />
        <div className="pointer-events-none absolute left-8 top-8 z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#202121]/65"><span className="h-2 w-2 rounded-full bg-[#f9d02d]" />Studio frame / {String(index + 1).padStart(2, '0')}</div>
        {href ? <Link to={href} aria-label={`Explore ${name}`} className="group absolute inset-0 block focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#f9d02d]"><StudioImage image={service.image} alt={name} eager={index === 0} className="h-full w-full object-contain p-10 transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none sm:p-14" /></Link>
          : <StudioImage image={service.image} alt={name} eager={index === 0} className="h-full w-full object-contain p-10 sm:p-14" />}
        <span className="pointer-events-none absolute bottom-7 right-8 z-10 border-b border-[#202121]/45 pb-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#202121]/65">Frame {String(index + 1).padStart(2, '0')}</span>
      </div>
    </div>
    <div className={`min-w-0 pt-7 lg:pt-0 ${index % 2 ? 'lg:order-1' : ''}`}>
      <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.17em] text-[#202121]/50"><span className="text-[#b79a13]">/ {String(index + 1).padStart(2, '0')}</span><span className="h-px w-12 bg-[#202121]/30" />Studio capability</p>
      <h3 className="mt-5 max-w-[14ch] break-words text-[clamp(2.4rem,4.7vw,5.3rem)] font-black leading-[.98] tracking-[-.06em] text-[#202121]">{href ? <Link to={href} className="hover:underline hover:decoration-[#f9d02d] hover:decoration-[5px] hover:underline-offset-8 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">{name}</Link> : name}</h3>
      {service.short_description?.trim() && <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-[#202121]/68 sm:text-lg">{service.short_description}</p>}
      {href && <Link to={href} className="mt-8 inline-flex min-h-11 items-center gap-3 border-b-2 border-[#202121] pb-1 text-sm font-extrabold text-[#202121] transition-colors hover:border-[#d5aa12] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Explore service <ArrowUpRight size={18} aria-hidden="true" /></Link>}
    </div>
  </article>;
}

function ServicesContent({ services, loading, error, retry, preview }: { services: StudioService[] | null; loading: boolean; error: boolean; retry?: () => void; preview: boolean }) {
  const content=useSecondaryContent('services');
  const items = services ?? [];
  const firstLoad = loading && services === null && !error;
  return <StaticPageLayout activePage="SERVICES">
    <section className="bg-[#202121] px-6 pb-14 pt-[132px] text-white sm:px-10 lg:px-12 lg:pb-16 lg:pt-[138px]"><div className="mx-auto max-w-[1480px]">
      <div className="flex flex-wrap items-center gap-4"><BackToLandingLink />{preview && <span className="border border-[#f9d02d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#f9d02d]" role="status">Design Preview — Sample Content</span>}</div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-end lg:gap-16">
        <div className={styles.enter}><p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.2em] text-[#f9d02d]"><span className="h-px w-10 bg-[#f9d02d]" />Uni-Inside Studio / Services</p><h1 className="mt-5 max-w-[13ch] text-[clamp(3.4rem,6.9vw,8.5rem)] font-black leading-[.91] tracking-[-.075em]">{preview?'Ideas,':content.heading} <span className="text-[#f9d02d]">{preview?'made visible.':content.accent}</span></h1></div>
        <div className={`max-w-xl lg:pb-2 ${styles.enterLater}`}><p className="text-lg leading-relaxed text-white/78 sm:text-xl">{preview?'Visual production and creative technology shaped around the story you need to tell. Explore our published capabilities, then bring us your brief.':content.description}</p><a href="#studio-offerings" className="mt-7 inline-flex min-h-11 items-center gap-3 border-b border-white/70 pb-1 text-sm font-extrabold text-white hover:border-[#f9d02d] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f9d02d]">{preview?'Explore the services':content.scroll_label} <ArrowDown size={18} aria-hidden="true" /></a></div>
      </div>
    </div></section>
    <section id="studio-offerings" className="bg-[#f0f0f0] px-6 pb-14 pt-11 sm:px-10 lg:px-12" aria-labelledby="studio-offerings-title"><div className="mx-auto max-w-[1480px]">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#202121]/50">The Studio / Capabilities</p><h2 id="studio-offerings-title" className="mt-2 text-[clamp(2rem,3.5vw,3.7rem)] font-black leading-none tracking-[-.055em] text-[#202121]">{preview?'Where we can help':content.listing_heading}</h2></div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#202121]/50" aria-live="polite">{error ? 'Services unavailable' : firstLoad ? 'Checking services' : `${items.length} ${preview ? 'sample' : 'published'} ${items.length === 1 ? 'service' : 'services'} loaded${preview ? '' : ' · up to 60 shown'}`}</p></div>
      {firstLoad ? <div role="status" aria-label="Loading published services" className="grid gap-10 border-t border-[#202121]/20 py-10 lg:grid-cols-2"><div className="aspect-[1.5] bg-[#dddcd6] motion-safe:animate-pulse" /><div className="space-y-5 pt-8"><div className="h-4 w-1/3 bg-[#dddcd6] motion-safe:animate-pulse" /><div className="h-16 w-3/4 bg-[#dddcd6] motion-safe:animate-pulse" /><div className="h-5 w-full bg-[#dddcd6] motion-safe:animate-pulse" /></div><span className="sr-only">Loading published services…</span></div>
        : error ? <div role="status" className="grid gap-7 border-t border-[#202121]/20 py-14 lg:grid-cols-[100px_1fr_auto] lg:items-end"><Clapperboard size={72} strokeWidth={1} className="text-[#202121]/25" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#202121]/50">Connection interrupted</p><h3 className="mt-2 text-3xl font-black tracking-tight text-[#202121]">The service list is unavailable.</h3><p className="mt-3 max-w-xl text-[#202121]/65">We could not load the published services. Please try again.</p></div><button type="button" onClick={retry} className="inline-flex min-h-12 w-fit items-center gap-2 bg-[#f9d02d] px-5 py-3 text-sm font-extrabold text-[#202121] hover:bg-[#ffe054] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Retry <ArrowRight size={17} aria-hidden="true" /></button></div>
        : items.length === 0 ? <div role="status" className="grid gap-7 border-t border-[#202121]/20 py-14 lg:grid-cols-[100px_1fr_auto] lg:items-end"><span className="text-7xl font-black tracking-[-.09em] text-[#202121]/15" aria-hidden="true">00</span><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#202121]/50">The Studio / In preparation</p><h3 className="mt-2 text-3xl font-black tracking-tight text-[#202121]">No published services yet.</h3><p className="mt-3 max-w-xl text-[#202121]/65">Our service pages will appear here as they are published. You can still tell us about your brief.</p></div><Link to="/#contact-us" className="inline-flex min-h-12 w-fit items-center gap-2 border border-[#202121] px-5 py-3 text-sm font-extrabold text-[#202121] hover:bg-[#202121] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Get in touch <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
        : <div>{items.map((service, index) => <ServiceEntry key={service.id ?? service.slug ?? index} service={service} index={index} preview={preview} />)}</div>}
    </div></section>
    <section className="bg-[#f9d02d] px-6 py-16 sm:px-10 lg:px-12 lg:py-20"><div className="mx-auto grid max-w-[1480px] gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/65">Your brief / Our conversation</p><h2 className="mt-3 max-w-[19ch] text-[clamp(2rem,4vw,4.2rem)] font-black leading-[1.02] tracking-[-.055em] text-[#202121]">{preview?'Have a story, challenge, or idea in mind?':content.cta_heading}</h2><p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[#202121]/70">{preview?'Tell us what you are working toward. We can discuss the right creative approach together.':content.cta_description}</p></div>{preview ? <p className="max-w-[30ch] border-l-4 border-[#202121] pl-4 text-sm font-semibold text-[#202121]/70">Sample content only — enquiry actions are unavailable in design preview.</p> : <Link to={content.cta_url} className="inline-flex min-h-12 w-fit items-center gap-3 bg-[#202121] px-6 py-4 text-sm font-extrabold text-white hover:bg-[#343535] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">{content.cta_label} <ArrowUpRight size={18} aria-hidden="true" /></Link>}</div></section>
  </StaticPageLayout>;
}

export function ServicesPage() {
  const location = useLocation();
  const preview = canShowStudioPreview(location.pathname, location.search);
  useDesignPreviewNoIndex(preview);
  return preview ? <ServicesContent services={studioPreviewServices} loading={false} error={false} preview /> : <PublishedServices />;
}
