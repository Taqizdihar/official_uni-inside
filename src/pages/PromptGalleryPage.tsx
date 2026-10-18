import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Copy, Search, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '../components/StaticPageLayout';
import { PromptVisual } from '../components/tools/PromptVisual';
import { promptGalleryData, type GalleryPrompt } from '../data/promptGalleryData';
import styles from './ToolsPages.module.css';

const categories = [...new Set(promptGalleryData.map((item) => item.category))];

function PromptCard({ item, onOpen, onCopy, copied, copyFailed }: {
  item: GalleryPrompt;
  onOpen: () => void;
  onCopy: () => void;
  copied: boolean;
  copyFailed: boolean;
}) {
  return <article className="group min-w-0 border-t border-[#202121]/20 pt-5">
    <button type="button" onClick={onOpen} aria-label={`View ${item.title} prompt details`} className="block w-full overflow-hidden text-left focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#202121]"><PromptVisual tone={item.visualTone} label={item.visualLabel} /></button>
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#202121]/60"><span>{item.category}</span><span aria-hidden="true">/</span><span>{item.aspectRatio}</span><span aria-hidden="true">/</span><span>{item.format}</span></div>
    <h2 className="mt-3 break-words text-[clamp(1.5rem,2.2vw,2rem)] font-black leading-[1.05] tracking-[-.045em] text-[#202121]"><button type="button" onClick={onOpen} className="text-left hover:underline hover:decoration-[#f9d02d] hover:decoration-4 hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">{item.title}</button></h2>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <button type="button" onClick={onCopy} className="inline-flex min-h-11 items-center gap-2 bg-[#202121] px-4 py-2 text-xs font-extrabold uppercase tracking-[.1em] text-white transition-colors hover:bg-[#f9d02d] hover:text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? 'Copied' : copyFailed ? 'Copy failed — retry' : 'Copy prompt'}</button>
      <button type="button" onClick={onOpen} className="inline-flex min-h-11 items-center gap-1 text-xs font-extrabold uppercase tracking-[.1em] text-[#202121] underline decoration-[#202121]/35 underline-offset-4 hover:decoration-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">View details <ArrowUpRight size={16} aria-hidden="true" /></button>
    </div>
  </article>;
}

function PromptDialog({ item, onClose, onCopy, copiedKey, failedKey }: {
  item: GalleryPrompt | null;
  onClose: () => void;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
  failedKey: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [item]);

  return <dialog ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="prompt-dialog-title" className="mx-auto my-auto w-[calc(100%-2rem)] max-w-[1040px] max-h-[92dvh] overflow-y-auto border-0 bg-[#f0f0f0] p-0 text-[#202121] shadow-2xl backdrop:bg-black/75">
    {item && <div className="grid lg:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]">
      <div className="min-h-[260px] lg:min-h-full"><PromptVisual tone={item.visualTone} label={item.visualLabel} large /></div>
      <div className="min-w-0 p-6 sm:p-9 lg:p-10">
        <div className="flex items-start justify-between gap-5"><p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#202121]/55">Prompt Gallery / {item.category}</p><button type="button" onClick={onClose} aria-label="Close prompt details" className="-m-2 grid h-11 w-11 flex-none place-items-center rounded-full text-[#202121] hover:bg-[#202121]/10 focus-visible:outline-2 focus-visible:outline-[#202121]"><X size={23} aria-hidden="true" /></button></div>
        <h2 id="prompt-dialog-title" className="mt-5 break-words text-[clamp(2rem,4vw,3.3rem)] font-black leading-[.98] tracking-[-.06em]">{item.title}</h2>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-[.1em]"><span className="border border-[#202121]/25 px-3 py-2">{item.aspectRatio}</span><span className="border border-[#202121]/25 px-3 py-2">{item.format}</span></div>
        <div className="mt-8 border-t border-[#202121]/25 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xs font-extrabold uppercase tracking-[.16em]">Full prompt</h3><button type="button" onClick={() => onCopy(item.prompt, item.id)} className="inline-flex min-h-11 items-center gap-2 bg-[#202121] px-4 py-2 text-xs font-extrabold uppercase tracking-[.1em] text-white hover:bg-[#f9d02d] hover:text-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">{copiedKey === item.id ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copiedKey === item.id ? 'Copied' : failedKey === item.id ? 'Copy failed — retry' : 'Copy prompt'}</button></div><p className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-[1.8] text-[#202121]/80">{item.prompt}</p></div>
        {item.negativePrompt && <div className="mt-8 border-t border-[#202121]/25 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xs font-extrabold uppercase tracking-[.16em]">Negative prompt</h3><button type="button" onClick={() => onCopy(item.negativePrompt!, `${item.id}:negative`)} className="inline-flex min-h-10 items-center gap-2 border border-[#202121]/30 px-3 py-2 text-xs font-bold text-[#202121] hover:border-[#202121] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121]">{copiedKey === `${item.id}:negative` ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copiedKey === `${item.id}:negative` ? 'Copied' : failedKey === `${item.id}:negative` ? 'Copy failed — retry' : 'Copy negative prompt'}</button></div><p className="mt-4 break-words text-sm leading-relaxed text-[#202121]/65">{item.negativePrompt}</p></div>}
        <div className="mt-8 flex flex-wrap gap-2" aria-label="Prompt tags">{item.tags.map((tag) => <span key={tag} className="bg-[#202121]/8 px-3 py-1.5 text-xs font-semibold text-[#202121]/70">{tag}</span>)}</div>
      </div>
    </div>}
  </dialog>;
}

export function PromptGalleryPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<GalleryPrompt | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return promptGalleryData.filter((item) => (!category || item.category === category) && (!term || [item.title, item.category, item.prompt, ...item.tags].some((value) => value.toLocaleLowerCase().includes(term))));
  }, [query, category]);
  useEffect(() => { if (!copiedKey) return; const timeout = window.setTimeout(() => { setCopiedKey(null); setCopyStatus(''); }, 2500); return () => window.clearTimeout(timeout); }, [copiedKey]);
  const copyPrompt = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFailedKey(null);
      setCopiedKey(key);
      setCopyStatus(key.endsWith(':negative') ? 'Negative prompt copied to clipboard.' : 'Prompt copied to clipboard.');
    } catch {
      setCopiedKey(null);
      setFailedKey(key);
      setCopyStatus('Copy failed. Please try again or select the text in the detail view.');
    }
  };
  const clearFilters = () => { setQuery(''); setCategory(null); };

  return <StaticPageLayout activePage="UNI-TOOLS">
    <section className="bg-[#202121] px-6 pb-14 pt-[145px] text-white sm:px-10 lg:px-12"><div className={`mx-auto max-w-[1440px] ${styles.enter}`}>
      <Link to="/tools" className="inline-flex min-h-11 items-center gap-2 border-b border-white/50 text-sm font-bold text-white hover:border-[#f9d02d] hover:text-[#f9d02d] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f9d02d]"><ArrowLeft size={17} aria-hidden="true" /> All Uni-Tools</Link>
      <div className="mt-12 grid items-end gap-8 lg:grid-cols-[1fr_365px]"><div><p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#f9d02d]"><Sparkles size={17} aria-hidden="true" /> Uni-Tools / 01</p><h1 className="mt-5 break-words text-[clamp(3.4rem,7.4vw,7rem)] font-black leading-[.92] tracking-[-.065em]">Prompt Gallery<span className="text-[#f9d02d]">.</span></h1></div><p className="max-w-[35ch] text-lg leading-relaxed text-white/70">Find a visual direction, open the full prompt, and copy it into your preferred creative tool.</p></div>
    </div></section>
    <div className="bg-[#f0f0f0] px-6 pb-24 pt-10 sm:px-10 lg:px-12"><div className="mx-auto max-w-[1440px]">
      <p className="mb-8 max-w-[65ch] text-sm leading-relaxed text-[#202121]/60">The abstract artwork previews each theme. It is not an AI-generated result.</p>
      <div className="flex flex-col gap-6 border-y border-[#202121]/20 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0"><label htmlFor="prompt-search" className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#202121]/60">Search prompts</label><div className="mt-2 flex h-12 w-full items-center gap-3 border border-[#202121]/30 bg-white px-4 focus-within:border-[#202121] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f9d02d] lg:w-[360px]"><Search size={18} aria-hidden="true" className="text-[#202121]/55" /><input id="prompt-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, themes, or tags" className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-[#202121] outline-none placeholder:text-[#202121]/45" /></div></div>
        <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#202121]/55" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'prompt' : 'prompts'} found</p>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-3" role="group" aria-label="Filter prompts by category"><button type="button" onClick={() => setCategory(null)} aria-pressed={category === null} className={`min-h-11 flex-none border px-4 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${category === null ? 'border-[#202121] bg-[#202121] text-white' : 'border-[#202121]/25 text-[#202121] hover:border-[#202121]'}`}>All prompts</button>{categories.map((option) => <button key={option} type="button" onClick={() => setCategory(option)} aria-pressed={category === option} className={`min-h-11 flex-none border px-4 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#202121] ${category === option ? 'border-[#202121] bg-[#202121] text-white' : 'border-[#202121]/25 text-[#202121] hover:border-[#202121]'}`}>{option}</button>)}</div>
      {filtered.length ? <div className="mt-8 grid gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <PromptCard key={item.id} item={item} onOpen={() => setSelected(item)} onCopy={() => void copyPrompt(item.prompt, item.id)} copied={copiedKey === item.id} copyFailed={failedKey === item.id} />)}</div>
        : <div role="status" className="mt-8 border-t border-[#202121]/20 py-16"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#202121]/50">No matches</p><h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#202121]">No prompts match those filters.</h2><p className="mt-3 text-[#202121]/65">Try a different term or browse every prompt.</p><button type="button" onClick={clearFilters} className="mt-6 min-h-11 bg-[#f9d02d] px-5 py-2 text-sm font-extrabold text-[#202121] hover:bg-[#ffe15a] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#202121]">Clear search and filters</button></div>}
      <div className="mt-20 flex flex-wrap items-center justify-between gap-6 border-t border-[#202121]/25 pt-8"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#202121]/50">On the horizon</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em] text-[#202121]">AI Prompt Builder — Coming Soon</h2><p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-[#202121]/65">A future tool for turning visual references into prompt ideas. For now, explore and copy from the gallery above.</p></div><Sparkles size={42} strokeWidth={1.4} className="text-[#202121]/35" aria-hidden="true" /></div>
      <p role="status" className="sr-only">{copyStatus}</p>
    </div></div>
    <PromptDialog item={selected} onClose={() => setSelected(null)} onCopy={(text, key) => void copyPrompt(text, key)} copiedKey={copiedKey} failedKey={failedKey} />
  </StaticPageLayout>;
}
