import { useEffect, useRef, useState, type MouseEvent, type PropsWithChildren } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowDownRight, ArrowUpRight, Check, Copy, Download, Mail, MoveRight } from 'lucide-react';
import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import studioLightLogo from '../assets/global/Logo - Light Theme.svg';
import studioDarkLogo from '../assets/global/Uni-Inside Studio White.avif';
import craftLogo from '../assets/global/Uni-Inside Crafts.svg';
import craftDarkMark from '../assets/global/Uni-Inside Craft White.avif';
import studioCollage from '../assets/about-us/complex-logo/complex-logo-composite.avif';
import cameraOperator from '../assets/our-services/Cameraman.avif';
import droneOperator from '../assets/our-services/Droneman.avif';
import creativeTechnology from '../assets/our-services/Programmer.avif';
import craftFigure from '../assets/our-products/3D Printer Products/Products - 5.png';
import craftCat from '../assets/our-products/3D Printer Products/Products - 13.png';

const brandColors = [
  { value: '#202121', label: 'Studio black', role: 'Core text and dark surfaces' },
  { value: '#f9d02d', label: 'Accent yellow', role: 'Highlights and calls to action' },
  { value: '#ffffff', label: 'White', role: 'Clear space and contrast' },
] as const;

const capabilityHighlights = [
  { title: 'Drone documentation', detail: 'Aerial capture for stories, research, and documentation.', image: droneOperator, alt: 'Uni-Inside drone operator holding a controller beside a drone', imageClass: 'object-contain object-bottom p-5' },
  { title: 'Creative technology', detail: 'Digital experiments and solutions shaped around an idea.', image: creativeTechnology, alt: 'Uni-Inside creative technologist holding a laptop', imageClass: 'object-contain object-bottom p-5' },
  { title: 'Custom 3D objects', detail: 'Original models and ready-made pieces made for the physical world.', image: craftCat, alt: 'Black and yellow cat-shaped 3D-printed product', imageClass: 'object-contain p-7' },
] as const;

const Reveal: React.FC<PropsWithChildren<{ className?: string; reduceMotion: boolean; delay?: number }>> = ({ children, className, reduceMotion, delay = 0 }) => (
  <motion.section
    className={className}
    initial={reduceMotion ? false : { opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.08 }}
    transition={{ duration: reduceMotion ? 0 : 0.58, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.section>
);

const SectionHeading: React.FC<{ eyebrow: string; title: string; description?: string; dark?: boolean }> = ({ eyebrow, title, description, dark = false }) => (
  <div className="max-w-3xl">
    <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${dark ? 'text-[#f9d02d]' : 'text-[#202121]/55'}`}>{eyebrow}</p>
    <h2 className={`mt-3 text-[clamp(2.2rem,5vw,4.4rem)] font-black leading-[0.98] tracking-[-0.055em] ${dark ? 'text-white' : 'text-[#202121]'}`}>{title}</h2>
    {description && <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${dark ? 'text-white/70' : 'text-[#202121]/70'}`}>{description}</p>}
  </div>
);

export const MediaKitPage = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const copyTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const scrollTo = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    window.history.replaceState(window.history.state, '', `#${id}`);
    target.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
  };

  const copyColor = async (color: (typeof brandColors)[number]) => {
    try {
      await navigator.clipboard.writeText(color.value);
      setCopiedColor(color.value);
      setCopyStatus(`${color.label}, ${color.value}, copied to clipboard.`);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        setCopiedColor(null);
        setCopyStatus('');
      }, 1800);
    } catch {
      setCopyStatus('Clipboard access is unavailable. Select the hex value to copy it.');
    }
  };

  const reportDownload = (label: string) => setDownloadStatus(`${label} download started.`);

  return (
    <StaticPageLayout activePage="MEDIA KIT">
      <section className="relative isolate overflow-hidden bg-[#202121] px-6 pb-16 pt-32 text-white sm:px-10 sm:pb-24 sm:pt-36 lg:px-12 lg:pb-28">
        <div className="pointer-events-none absolute -right-24 top-16 h-96 w-96 rounded-full border border-white/10 sm:right-0 sm:top-24" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-10 top-32 h-72 w-72 rounded-full border border-[#f9d02d]/30 sm:right-14 sm:top-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <BackToLandingLink />
          <div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1fr_0.92fr] lg:gap-12">
            <div className="relative z-10">
              <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#f9d02d] sm:text-sm">
                <span className="h-px w-9 bg-[#f9d02d]" aria-hidden="true" />
                The Uni-Inside identity
              </p>
              <h1 className="mt-5 text-[clamp(3.7rem,10vw,8.25rem)] font-black leading-[0.86] tracking-[-0.075em]">
                MEDIA<br /><span className="text-[#f9d02d]">KIT</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg font-semibold leading-snug text-white sm:text-2xl">Creative Inside, Impact Outside.</p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
                Uni-Inside Studio brings ideas to life through multimedia production and creative technology, while Uni-Inside Craft turns ideas into custom 3D-printed creations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#brand" onClick={scrollTo('brand')} className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-[#f9d02d] px-5 py-3 text-sm font-extrabold text-[#202121] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121] motion-reduce:transition-none">
                  Explore the Brand <ArrowDownRight size={17} className="transition-transform group-hover:translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                </a>
                <a href="#downloads" onClick={scrollTo('downloads')} className="group inline-flex min-h-12 items-center gap-3 rounded-full border border-white/50 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-[#f9d02d] hover:text-[#f9d02d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#202121] motion-reduce:transition-none">
                  Download Logos <Download size={16} aria-hidden="true" />
                </a>
                <a href="mailto:uninsidemed@gmail.com" className="inline-flex min-h-12 items-center gap-3 rounded-full px-4 py-3 text-sm font-bold text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] motion-reduce:transition-none">
                  Contact Uni-Inside <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>

            <figure className="group relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/15 bg-[#f9d02d] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-5">
              <div className="relative aspect-[1.08/1] overflow-hidden rounded-[1.4rem] bg-[#f2c828]">
                <img src={studioCollage} alt="Uni-Inside Studio identity collage with creators, cameras, a drone, and digital tools" width="1080" height="1080" fetchPriority="high" className="h-full w-full object-contain transition-transform duration-700 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none" />
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-6">
                  <figcaption className="rounded-full border border-[#202121]/15 bg-[#202121] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white sm:text-xs">One identity · two workspaces</figcaption>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#202121]" aria-hidden="true"><ArrowDown size={19} /></span>
                </div>
              </div>
            </figure>
          </div>
        </div>
      </section>

      <Reveal reduceMotion={reduceMotion} className="bg-[#f0f0f0] px-6 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div id="brand" className="mx-auto grid max-w-7xl scroll-mt-36 gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-20">
          <div>
            <SectionHeading eyebrow="Uni-Inside at a glance" title="A shared idea, made visible." description="Uni-Inside is a Bandung-based creative technology startup with two connected workspaces: Studio for visual and digital services, and Craft for designed, 3D-printed objects." />
            <p className="mt-8 max-w-2xl border-l-[3px] border-[#f9d02d] pl-5 text-base leading-relaxed text-[#202121]/75 sm:text-lg">
              Uni-Inside Studio brings ideas to life through multimedia production and creative technology, while Uni-Inside Craft turns ideas into custom 3D-printed creations.
            </p>
          </div>
          <dl className="grid grid-cols-3 border-y border-[#202121]/25 py-5 sm:py-7">
            {[
              ['10+', 'Projects'],
              ['250+', 'Products'],
              ['12', 'Collaborators'],
            ].map(([number, label]) => (
              <div key={label} className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-4">
                <dt className="font-['Anton',Impact,sans-serif] text-[clamp(2.25rem,5vw,4rem)] leading-none tracking-tight text-[#202121]">{number}</dt>
                <dd className="mt-2 text-[10px] font-extrabold uppercase leading-tight tracking-[0.1em] text-[#202121]/60 sm:text-xs">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      <Reveal reduceMotion={reduceMotion} className="bg-white px-6 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Two workspaces" title="Different tools. One point of view." description="Studio and Craft approach ideas through different materials and processes, connected by the same curiosity and care." />
          <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2 lg:gap-8">
            <article className="group grid min-w-0 overflow-hidden rounded-[1.75rem] border border-[#202121]/10 bg-[#f7f7f5] sm:grid-cols-[0.8fr_1.2fr]">
              <div className="relative flex min-h-64 items-end justify-center overflow-hidden bg-[#202121] sm:min-h-[27rem]">
                <span className="absolute left-5 top-5 z-10 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/50">01 / Studio</span>
                <img src={cameraOperator} alt="Camera operator representing Uni-Inside Studio production work" width="2700" height="2700" loading="lazy" decoding="async" className="h-[94%] w-full object-contain object-bottom transition-transform duration-500 motion-safe:group-hover:scale-[1.035] motion-reduce:transition-none" />
                <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-[#202121]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Visual · Digital</span>
              </div>
              <div className="flex flex-col p-6 sm:p-7 lg:p-8">
                <img src={studioLightLogo} alt="Uni-Inside Studio logo for light backgrounds" width="1095" height="1095" className="h-14 w-14 object-contain" />
                <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#202121]/50">Service workspace</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#202121] sm:text-3xl">Uni-Inside Studio</h3>
                <p className="mt-4 text-sm leading-relaxed text-[#202121]/70 sm:text-base">Photography, videography, drone documentation, editing, company profiles, research documentation, and creative digital solutions.</p>
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Studio capabilities">
                  {['Photography', 'Video', 'Drone', 'Research documentation'].map((item) => <li key={item} className="rounded-full border border-[#202121]/15 px-3 py-1.5 text-[10px] font-bold text-[#202121]/75 sm:text-xs">{item}</li>)}
                </ul>
                <a href="/services" className="group/link mt-auto inline-flex w-fit items-center gap-2 pt-7 text-sm font-extrabold text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d]">
                  Explore Studio services <MoveRight size={16} className="transition-transform group-hover/link:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </a>
              </div>
            </article>

            <article className="group grid min-w-0 overflow-hidden rounded-[1.75rem] border border-[#202121]/10 bg-[#f7f7f5] sm:grid-cols-[0.8fr_1.2fr]">
              <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[#f9d02d] sm:min-h-[27rem]">
                <span className="absolute left-5 top-5 z-10 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#202121]/55">02 / Craft</span>
                <img src={craftFigure} alt="Winged figurine from Uni-Inside Craft product visuals" width="500" height="500" loading="lazy" decoding="async" className="absolute bottom-2 left-[23%] h-[76%] w-[76%] object-contain transition-transform duration-500 motion-safe:group-hover:scale-[1.035] motion-reduce:transition-none" />
                <img src={craftCat} alt="Black and yellow cat-shaped 3D-printed product" width="500" height="500" loading="lazy" decoding="async" className="absolute bottom-5 left-3 h-[36%] w-[36%] object-contain drop-shadow-[0_12px_14px_rgba(32,33,33,0.15)]" />
                <span className="absolute bottom-4 right-4 rounded-full bg-[#202121] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Design · Print</span>
              </div>
              <div className="flex flex-col p-6 sm:p-7 lg:p-8">
                <img src={craftLogo} alt="Official Uni-Inside Craft logo" width="1034" height="1160" className="h-14 w-14 object-contain" />
                <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#202121]/50">Product workspace</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#202121] sm:text-3xl">Uni-Inside Craft</h3>
                <p className="mt-4 text-sm leading-relaxed text-[#202121]/70 sm:text-base">Ready-made and custom 3D-printed objects, from functional everyday pieces to character models and original designs built from scratch.</p>
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Craft capabilities">
                  {['Custom 3D printing', 'Original models', 'Ready-made objects', 'Product design'].map((item) => <li key={item} className="rounded-full border border-[#202121]/15 px-3 py-1.5 text-[10px] font-bold text-[#202121]/75 sm:text-xs">{item}</li>)}
                </ul>
                <a href="/products" className="group/link mt-auto inline-flex w-fit items-center gap-2 pt-7 text-sm font-extrabold text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f9d02d]">
                  Explore Craft products <MoveRight size={16} className="transition-transform group-hover/link:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                </a>
              </div>
            </article>
          </div>
        </div>
      </Reveal>

      <Reveal reduceMotion={reduceMotion} className="bg-[#202121] px-6 py-16 text-white sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading dark eyebrow="Selected capabilities" title="A few ways ideas take shape." description="Capability imagery from the Studio and Craft visual libraries—not client case studies." />
            <span className="hidden pb-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45 sm:block">Explore · Make · Share</span>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {capabilityHighlights.map((item, index) => (
              <article key={item.title} className="group min-w-0 border-t border-white/20 pt-4">
                <figure className="relative aspect-[1.15/1] overflow-hidden rounded-2xl bg-[#292a2a]">
                  <img src={item.image} alt={item.alt} width="1080" height="1080" loading="lazy" decoding="async" className={`h-full w-full transition-transform duration-500 motion-safe:group-hover:scale-[1.04] motion-reduce:transition-none ${item.imageClass}`} />
                  <span className="absolute left-4 top-4 rounded-full bg-[#f9d02d] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#202121]">0{index + 1}</span>
                </figure>
                <div className="flex items-start justify-between gap-4 py-5">
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight sm:text-xl">{item.title}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60">{item.detail}</p>
                  </div>
                  <ArrowUpRight className="mt-1 shrink-0 text-[#f9d02d] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" size={19} aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal reduceMotion={reduceMotion} className="bg-[#f0f0f0] px-6 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow="Visual identity" title="Color, with purpose." description="A compact palette keeps the work recognizable across screens, printed materials, and physical objects." />
            <div className="mt-8 flex items-start gap-3 border-t border-[#202121]/20 pt-5">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#f9d02d]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-[#202121]/65">Copy a color value for use in a design file. Each button also announces its result to assistive technology.</p>
            </div>
            <p className="mt-3 min-h-5 text-xs font-bold text-[#202121]/65" aria-live="polite">{copyStatus}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {brandColors.map((color) => (
              <article key={color.value} className="overflow-hidden rounded-2xl border border-[#202121]/10 bg-white">
                <div className="relative flex h-32 items-end p-4 sm:h-40" style={{ backgroundColor: color.value }}>
                  <span className={`font-mono text-sm font-bold ${color.value === '#202121' ? 'text-white' : 'text-[#202121]'}`}>{color.value}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-extrabold text-[#202121]">{color.label}</h3>
                  <p className="mt-1 min-h-10 text-xs leading-relaxed text-[#202121]/60">{color.role}</p>
                  <button type="button" onClick={() => void copyColor(color)} aria-label={`Copy ${color.label} hex value ${color.value}`} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#202121]/20 px-3 py-2 text-xs font-extrabold text-[#202121] transition-colors hover:border-[#202121] hover:bg-[#202121] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2 motion-reduce:transition-none">
                    {copiedColor === color.value ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copiedColor === color.value ? 'Copied' : 'Copy hex'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal reduceMotion={reduceMotion} className="bg-white px-6 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Typography" title="Poppins, with a clear voice." description="Poppins is the site’s sans-serif, used for headings, body copy, and interface text. Anton appears as a supporting display style for selected trust figures." />
          <div className="overflow-hidden rounded-[1.75rem] border border-[#202121]/10 bg-[#f7f7f5] p-6 sm:p-9">
            <div className="flex items-center justify-between gap-4 border-b border-[#202121]/15 pb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#202121]/55">Primary · Poppins</span>
              <span className="text-[10px] font-semibold text-[#202121]/45">Regular → Black</span>
            </div>
            <p className="mt-6 font-sans text-[clamp(1.75rem,4vw,3.2rem)] font-black leading-tight tracking-[-0.05em] text-[#202121]">Make the idea tangible.</p>
            <p className="mt-3 max-w-lg font-sans text-base leading-relaxed text-[#202121]/70 sm:text-lg">Clear words give the work room to speak. Use a confident heading, readable body copy, and generous line spacing.</p>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-t border-[#202121]/15 pt-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#202121]/50">Supporting display · Anton</p>
                <p className="mt-2 font-['Anton',Impact,sans-serif] text-5xl leading-none text-[#202121] sm:text-6xl">10+ · 250+ · 12</p>
              </div>
              <p className="max-w-40 text-xs leading-relaxed text-[#202121]/55">Reserved for compact numeric emphasis.</p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal reduceMotion={reduceMotion} className="bg-[#f0f0f0] px-6 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div id="downloads" className="mx-auto max-w-7xl scroll-mt-36">
          <SectionHeading eyebrow="Logo use & downloads" title="Keep the artwork clear." description="Use the supplied marks as they are: preserve their proportions, keep them unobstructed, and choose a high-contrast background. Do not recolor, stretch, rotate, or add effects." />
          <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2 lg:gap-8">
            <article className="overflow-hidden rounded-[1.75rem] border border-[#202121]/10 bg-white p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#202121]/50">Workspace one</p><h3 className="mt-1 text-xl font-black text-[#202121]">Uni-Inside Studio</h3></div>
                <span className="text-xs font-bold text-[#202121]/45">01</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex min-h-36 items-center justify-center rounded-xl bg-[#f0f0f0] p-5 sm:min-h-44">
                  <img src={studioLightLogo} alt="Uni-Inside Studio dark logo on a light background" width="1095" height="1095" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                </div>
                <div className="flex min-h-36 items-center justify-center rounded-xl bg-[#202121] p-5 sm:min-h-44">
                  <img src={studioDarkLogo} alt="Uni-Inside Studio white logo on a dark background" width="2190" height="2190" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <a href={studioLightLogo} download="uni-inside-studio-light-background.svg" onClick={() => reportDownload('Studio light-background logo')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#202121] px-4 py-3 text-center text-xs font-extrabold text-white transition-colors hover:bg-[#393a38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d02d] focus-visible:ring-offset-2 motion-reduce:transition-none">
                  <Download size={15} aria-hidden="true" /> Studio SVG · light surfaces
                </a>
                <a href={studioDarkLogo} download="uni-inside-studio-white.avif" onClick={() => reportDownload('Studio white logo')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#202121]/20 px-4 py-3 text-center text-xs font-extrabold text-[#202121] transition-colors hover:bg-[#202121] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2 motion-reduce:transition-none">
                  <Download size={15} aria-hidden="true" /> Studio AVIF · dark surfaces
                </a>
              </div>
            </article>

            <article className="overflow-hidden rounded-[1.75rem] border border-[#202121]/10 bg-white p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#202121]/50">Workspace two</p><h3 className="mt-1 text-xl font-black text-[#202121]">Uni-Inside Craft</h3></div>
                <span className="text-xs font-bold text-[#202121]/45">02</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex min-h-36 items-center justify-center rounded-xl bg-white p-5 sm:min-h-44">
                  <img src={craftLogo} alt="Official Uni-Inside Craft logo on a light background" width="1034" height="1160" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                </div>
                <div className="flex min-h-36 items-center justify-center rounded-xl bg-[#202121] p-5 sm:min-h-44">
                  <img src={craftDarkMark} alt="Uni-Inside Craft white cube mark on a dark background" width="2068" height="2320" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <a href={craftLogo} download="uni-inside-craft-logo.svg" onClick={() => reportDownload('Craft logo')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f9d02d] px-4 py-3 text-center text-xs font-extrabold text-[#202121] transition-colors hover:bg-[#202121] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2 motion-reduce:transition-none">
                  <Download size={15} aria-hidden="true" /> Craft SVG · light surfaces
                </a>
                <a href={craftDarkMark} download="uni-inside-craft-white-mark.avif" onClick={() => reportDownload('Craft white mark')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#202121]/20 px-4 py-3 text-center text-xs font-extrabold text-[#202121] transition-colors hover:bg-[#202121] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2 motion-reduce:transition-none">
                  <Download size={15} aria-hidden="true" /> Craft AVIF mark · dark surfaces
                </a>
              </div>
            </article>
          </div>
          <p className="mt-5 min-h-5 text-xs font-bold text-[#202121]/60" aria-live="polite">{downloadStatus}</p>
        </div>
      </Reveal>

      <Reveal reduceMotion={reduceMotion} className="bg-[#f9d02d] px-6 py-16 sm:px-10 sm:py-24 lg:px-12 lg:py-28">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#202121]/60">Media & collaborations</p>
            <h2 className="mt-3 text-[clamp(2.4rem,5.5vw,5rem)] font-black leading-[0.95] tracking-[-0.06em] text-[#202121]">Have an idea to bring inside?</h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#202121]/75 sm:text-lg">For media inquiries, collaborations, or brand questions, get in touch with the Uni-Inside team.</p>
          </div>
          <a href="mailto:uninsidemed@gmail.com" className="group inline-flex min-h-14 w-fit shrink-0 items-center gap-3 rounded-full bg-[#202121] px-6 py-4 text-sm font-extrabold text-white transition-colors hover:bg-white hover:text-[#202121] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202121] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f9d02d] motion-reduce:transition-none">
            <Mail size={17} aria-hidden="true" /> uninsidemed@gmail.com <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </a>
        </div>
      </Reveal>
    </StaticPageLayout>
  );
};
