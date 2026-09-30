import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Camera, 
  Video as VideoIcon, 
  X, 
  Search
} from 'lucide-react';
import { BackToLandingLink, StaticPageLayout } from '../components/StaticPageLayout';
import { promptGalleryData, type PromptGalleryItem } from '../data/promptGalleryData';
import { GeminiPromptSection } from '../components/GeminiPromptSection';
import { type GeneratedPromptResult } from '../lib/geminiPromptService';

import { getLocalPrompts, saveLocalPrompts } from '../lib/cmsApi';

type FilterCategory = 'ALL' | 'PORTRAIT' | 'PRODUCT' | 'REELS' | 'LANDSCAPE' | 'CINEMATIC' | '3D';

const FILTER_OPTIONS: { id: FilterCategory; label: string }[] = [
  { id: 'ALL', label: 'ALL' },
  { id: 'PORTRAIT', label: 'PORTRAIT' },
  { id: 'PRODUCT', label: 'PRODUCT' },
  { id: 'REELS', label: 'REELS' },
  { id: 'LANDSCAPE', label: 'LANDSCAPE' },
  { id: 'CINEMATIC', label: 'CINEMATIC' },
  { id: '3D', label: '3D' },
];

export const PromptGalleryPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PromptGalleryItem | null>(null);
  const [galleryItems, setGalleryItems] = useState<PromptGalleryItem[]>(() => getLocalPrompts());

  // Reload prompts if local storage changes
  React.useEffect(() => {
    setGalleryItems(getLocalPrompts());
  }, []);

  const handleAddGeneratedItem = (generated: GeneratedPromptResult) => {
    const newItem: PromptGalleryItem = {
      id: `pg-ai-${Date.now()}`,
      title: generated.title,
      category: generated.category,
      type: 'photo',
      orientation: generated.aspectRatio === '16:9' ? 'landscape' : 'portrait',
      aspectRatio: generated.aspectRatio,
      prompt: generated.prompt,
      negativePrompt: generated.negativePrompt,
      model: 'Google Gemini AI',
      seed: String(Math.floor(100000000 + Math.random() * 900000000)),
      src: generated.imageUrl || (generated.aspectRatio === '9:16'
        ? '/images/buah-naga-estetik.jpg'
        : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80'),
      tags: generated.tags,
    };
    const updated = [newItem, ...galleryItems];
    setGalleryItems(updated);
    saveLocalPrompts(updated);
  };

  // Filter logic ensuring all tabs and search keywords have relevant content
  const filteredItems = useMemo(() => {
    let items = [...galleryItems];

    if (activeFilter !== 'ALL') {
      items = items.filter((item) => {
        const catLower = item.category.toLowerCase();
        const tagsLower = item.tags.map(t => t.toLowerCase());

        if (activeFilter === 'PORTRAIT') {
          return item.orientation === 'portrait' || item.aspectRatio === '3:4' || item.aspectRatio === '9:16';
        }
        if (activeFilter === 'PRODUCT') {
          return catLower.includes('product') || catLower.includes('design') || catLower.includes('food') || catLower.includes('commercial') || tagsLower.some(t => t.includes('product') || t.includes('buah') || t.includes('food'));
        }
        if (activeFilter === 'REELS') {
          return item.aspectRatio === '9:16' || tagsLower.some(t => t.includes('reel') || t.includes('vertical'));
        }
        if (activeFilter === 'LANDSCAPE') {
          return item.orientation === 'landscape' || item.aspectRatio === '16:9' || item.aspectRatio === '21:9';
        }
        if (activeFilter === 'CINEMATIC') {
          return item.type === 'video' || catLower.includes('cinematography') || tagsLower.some(t => t.includes('cinematic'));
        }
        if (activeFilter === '3D') {
          return catLower.includes('motion') || catLower.includes('abstract') || catLower.includes('creature') || tagsLower.some(t => t.includes('3d') || t.includes('fluid'));
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return items;
  }, [activeFilter, searchQuery]);

  const handleCopy = (e: React.MouseEvent, promptText: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <StaticPageLayout activePage="PROMPT GALLERY">
      {/* =========================================================================
          1. HERO HEADER SECTION (Identical structure to Media Kit Page)
      ========================================================================= */}
      <section className="relative overflow-hidden bg-[#202121] px-6 pb-20 pt-40 text-white sm:px-10 sm:pb-28 lg:px-12">
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#f9d02d]/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <BackToLandingLink />
          <p className="mt-16 text-sm font-extrabold uppercase tracking-[0.2em] text-[#f9d02d]">
            Uni-Inside Studio
          </p>
          <h1 className="mt-4 text-[clamp(56px,10.5vw,140px)] font-black leading-none tracking-tight text-white">
            PROMPT GALLERY
          </h1>
          <p className="mt-7 w-[calc(100vw-3rem)] max-w-2xl text-lg font-medium leading-relaxed text-white/80 sm:w-auto sm:text-2xl">
            <span className="block sm:inline">A curated collection of ready-to-use photo &amp; video prompts.</span>{' '}
            <span className="block sm:inline">Simply copy the formula, tweak it slightly,</span>{' '}
            <span className="block sm:inline">and instantly bring your best visual ideas to life.</span>
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. GEMINI AI GENERATOR SECTION (Persis Format 2-Kolom Sesuai Screenshot)
      ========================================================================= */}
      <div className="bg-[#f0f0f0] border-t border-black/5">
        <GeminiPromptSection onAddToGallery={handleAddGeneratedItem} />
      </div>

      {/* =========================================================================
          3. INTERACTIVE PROMPT COLLECTION (5cm Side Margins)
      ========================================================================= */}
      <div id="prompt-collection" className="bg-[#f0f0f0] border-t border-black/8 min-h-[60vh] pb-20">
        {/* Sticky Filter Bar */}
        <section className="sticky top-20 z-40 py-5 px-6 sm:px-12 lg:px-[4cm] xl:px-[5cm] bg-white/85 backdrop-blur-xl border-b border-black/8 shadow-sm">
          <div className="w-full mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar py-1">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {FILTER_OPTIONS.map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-6 sm:px-7 py-3 rounded-full text-xs sm:text-sm font-extrabold tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#f9d02d] text-[#202121] shadow-[0_4px_16px_rgba(249,208,45,0.45)] scale-105 border border-[#f9d02d]'
                        : 'bg-white text-[#202121]/75 hover:text-[#202121] hover:bg-zinc-100 border border-black/10 shadow-sm'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Gemini AI Quick Scroll Button & Interactive Search Bar */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('gemini-generator')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#202121] hover:bg-black text-[#f9d02d] text-xs sm:text-sm font-extrabold tracking-wider transition-all duration-200 cursor-pointer shadow-md hover:scale-105 whitespace-nowrap border border-[#f9d02d]/40"
              >
                <Sparkles className="w-3.5 h-3.5 fill-[#f9d02d]" />
                <span>AI Gemini</span>
              </button>

              <div className="relative flex items-center min-w-[190px] sm:min-w-[260px]">
                <Search className="absolute left-4 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari prompt / gaya..."
                  className="w-full pl-11 pr-9 py-2.5 rounded-full bg-white border border-black/10 text-xs sm:text-sm font-medium text-[#202121] placeholder:text-zinc-400 focus:outline-none focus:border-[#f9d02d] focus:ring-2 focus:ring-[#f9d02d]/30 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-3 w-5 h-5 rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Prompt Collection Grid (5cm Side Margins) */}
        <main className="w-full mx-auto px-6 sm:px-12 lg:px-[4cm] xl:px-[5cm] py-12">
          {filteredItems.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white border border-black/10 flex items-center justify-center mb-4 shadow-sm">
                <Search className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold text-[#202121]">Tidak ada prompt ditemukan</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                Tidak ada hasil untuk pencarian &ldquo;{searchQuery}&rdquo;. Coba kata kunci lain atau reset filter.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveFilter('ALL'); }}
                className="mt-6 px-6 py-2.5 rounded-full bg-[#f9d02d] text-[#202121] text-xs font-extrabold uppercase tracking-wider hover:brightness-105 transition-all shadow-sm cursor-pointer"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            <motion.div 
              layout
              className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => {
                  const isCopied = copiedId === item.id;
                  const isVideo = item.type === 'video';

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: index * 0.03 }}
                      className="group relative break-inside-avoid overflow-hidden rounded-[2rem] bg-white border border-black/8 hover:border-[#f9d02d] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] cursor-pointer flex flex-col justify-between"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Media Frame */}
                      <div className="relative w-full overflow-hidden bg-zinc-100">
                        <img
                          src={item.src}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-mono font-bold uppercase text-[#202121] shadow-sm">
                            {isVideo ? <VideoIcon className="w-3 h-3 text-[#202121]" /> : <Camera className="w-3 h-3 text-[#202121]" />}
                            <span>{isVideo ? 'Video' : 'Foto'}</span>
                          </span>

                          <span className="px-2.5 py-1 rounded-full bg-[#f9d02d] text-[#202121] text-[10px] font-mono font-extrabold uppercase tracking-wider shadow-sm">
                            {item.aspectRatio}
                          </span>
                        </div>

                        {/* Hover Copy Action Button */}
                        <div className="absolute bottom-4 right-4 z-20">
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, item.prompt, item.id)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer shadow-md ${
                              isCopied
                                ? 'bg-emerald-500 text-white scale-105'
                                : 'bg-white/95 backdrop-blur-md border border-black/10 text-[#202121] hover:bg-[#f9d02d] hover:border-[#f9d02d]'
                            }`}
                            title="Copy Prompt"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden group-hover:inline">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Card Info Content */}
                      <div className="p-6 bg-white">
                        <div className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-[#202121]/60 mb-1">
                          {item.category}
                        </div>
                        <h3 className="text-lg font-black text-[#202121] leading-snug line-clamp-1 group-hover:text-[#202121] transition-colors">
                          {item.title}
                        </h3>
                        <p className="mt-3 text-xs text-[#202121]/75 line-clamp-2 font-mono leading-relaxed bg-[#f8f9fa] p-3 rounded-xl border border-black/5">
                          {item.prompt}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </main>
      </div>

      {/* =========================================================================
          4. MODAL LIGHTBOX DETAIL PREVIEW
      ========================================================================= */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 lg:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white border border-black/10 shadow-2xl text-[#202121] flex flex-col lg:flex-row overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                aria-label="Tutup preview"
                className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-black/10 text-[#202121] flex items-center justify-center hover:bg-[#f9d02d] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Media View */}
              <div className="lg:w-1/2 bg-zinc-950 flex items-center justify-center relative min-h-[300px] lg:min-h-[500px]">
                {selectedItem.type === 'video' && selectedItem.videoSrc ? (
                  <video
                    src={selectedItem.videoSrc}
                    poster={selectedItem.src}
                    controls
                    autoPlay
                    loop
                    className="max-h-[70vh] w-full object-contain"
                  />
                ) : (
                  <img
                    src={selectedItem.src}
                    alt={selectedItem.title}
                    className="max-h-[75vh] w-full object-contain"
                  />
                )}

                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-[#f9d02d] border border-white/10">
                    {selectedItem.aspectRatio} • {selectedItem.orientation}
                  </span>
                </div>
              </div>

              {/* Prompt Detail Column */}
              <div className="lg:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-y-auto bg-white">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#202121] leading-tight pr-8">
                    {selectedItem.title}
                  </h2>

                  {/* Main Prompt Box */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#202121]/60 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#f9d02d]" /> Teks Prompt
                      </span>
                      <button
                        onClick={(e) => handleCopy(e, selectedItem.prompt, selectedItem.id)}
                        className={`text-xs font-extrabold flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                          copiedId === selectedItem.id
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[#f9d02d] text-[#202121] hover:brightness-105 shadow-sm'
                        }`}
                      >
                        {copiedId === selectedItem.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === selectedItem.id ? 'Tersalin!' : 'Copy Prompt'}
                      </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-black/10 font-mono text-xs sm:text-sm text-[#202121] leading-relaxed max-h-72 overflow-y-auto select-all">
                      {selectedItem.prompt}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-8 pt-5 border-t border-black/10 flex items-center justify-between">
                  <p className="text-xs text-[#202121]/50 font-mono">
                    Uni-Inside Creative Studio
                  </p>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-6 py-2.5 rounded-full border border-black/15 text-xs font-bold uppercase tracking-wider text-[#202121] hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </StaticPageLayout>
  );
};

export default PromptGalleryPage;
