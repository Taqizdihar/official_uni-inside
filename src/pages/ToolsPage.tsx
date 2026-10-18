import { ArrowUpRight, Copy, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import { PromptVisual } from '../components/tools/PromptVisual';
import styles from './ToolsPages.module.css';

export function ToolsPage() {
  return <StaticPageLayout activePage="UNI-TOOLS">
    <section className="bg-[#202121] px-6 pb-16 pt-[145px] text-white sm:px-10 sm:pb-20 lg:px-12">
      <div className="mx-auto max-w-[1440px]">
        <BackToLandingLink />
        <div className={`mt-14 grid items-end gap-8 lg:grid-cols-[1fr_350px] ${styles.enter}`}>
          <div>
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.2em] text-[#f9d02d]"><Sparkles size={18} aria-hidden="true" /> Uni-Inside Studio / Tools</p>
            <h1 className="mt-5 text-[clamp(4rem,9vw,9rem)] font-black leading-[.9] tracking-[-.07em]">UNI-TOOLS<span className="text-[#f9d02d]">.</span></h1>
          </div>
          <p className="max-w-[36ch] text-lg leading-relaxed text-white/70 sm:text-xl">A small collection of practical creative tools, built to help ideas move forward.</p>
        </div>
      </div>
    </section>

    <section className="bg-[#f0f0f0] px-6 pb-24 pt-12 sm:px-10 lg:px-12" aria-labelledby="available-tools-heading">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#202121]/20 pb-5">
          <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#202121]/55">The directory / 01</p><h2 id="available-tools-heading" className="mt-2 text-3xl font-black tracking-[-.05em] text-[#202121] sm:text-4xl">Available now</h2></div>
          <p className="text-sm text-[#202121]/60">Explore, find a direction, and start creating.</p>
        </div>
        <Link to="/tools/prompt-gallery" className={`group grid min-w-0 overflow-hidden bg-[#202121] text-white focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#c69c00] lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] ${styles.toolCard}`} aria-label="Explore Prompt Gallery">
          <div className="min-h-[280px] lg:min-h-[490px]"><PromptVisual tone="neon" label="IDEAS / IN MOTION" large /></div>
          <div className="flex min-w-0 flex-col justify-between p-7 sm:p-10 lg:p-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]">01 / Visual prompts</p>
              <h3 className="mt-6 break-words text-[clamp(2.8rem,5vw,5rem)] font-black leading-[.95] tracking-[-.06em]">Prompt Gallery</h3>
              <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-white/70 sm:text-lg">Explore ready-to-use visual prompts, open the full direction, and copy it into your preferred image or motion generation tool.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[.1em] text-white/70"><span className="inline-flex items-center gap-2 border border-white/20 px-3 py-2"><Search size={15} aria-hidden="true" /> Find a theme</span><span className="inline-flex items-center gap-2 border border-white/20 px-3 py-2"><Copy size={15} aria-hidden="true" /> Copy a prompt</span></div>
            </div>
            <span className="mt-10 inline-flex w-fit items-center gap-3 border-b-2 border-[#f9d02d] pb-2 text-sm font-extrabold uppercase tracking-[.12em] text-[#f9d02d]">Explore Prompt Gallery <ArrowUpRight size={21} aria-hidden="true" className={styles.actionArrow} /></span>
          </div>
        </Link>
      </div>
    </section>
  </StaticPageLayout>;
}
