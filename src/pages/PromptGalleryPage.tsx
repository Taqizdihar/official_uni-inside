import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Camera, 
  Video as VideoIcon, 
  Smartphone, 
  Tv, 
  Maximize2, 
  X, 
  ArrowLeft,
  ArrowRight,
  Terminal,
  Layers,
  Zap,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { promptGalleryData, type PromptGalleryItem } from '../data/promptGalleryData';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PromptGalleryItem | null>(null);

  // Filter logic ensuring all tabs have relevant content
  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return promptGalleryData;
    return promptGalleryData.filter((item) => {
      const catLower = item.category.toLowerCase();
      const tagsLower = item.tags.map(t => t.toLowerCase());

      if (activeFilter === 'PORTRAIT') {
        return item.orientation === 'portrait' || item.aspectRatio === '3:4' || item.aspectRatio === '9:16';
      }
      if (activeFilter === 'PRODUCT') {
        return catLower.includes('product') || catLower.includes('design') || tagsLower.some(t => t.includes('product'));
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
  }, [activeFilter]);

  const handleCopy = (e: React.MouseEvent, promptText: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#202121] text-white selection:bg-[#f9d02d] selection:text-[#202121] font-sans antialiased overflow-x-hidden relative">
      
      {/* Background Ambient Glows */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 15%, rgba(249, 208, 45, 0.06) 0%, transparent 60%), radial-gradient(circle at 85% 70%, rgba(249, 208, 45, 0.04) 0%, transparent 50%)',
        }}
      />

      {/* =========================================================================
          1. HEADER NAVIGATION
      ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-5 pointer-events-none">
        <nav className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Back to Home Button */}
          <Link 
            to="/" 
            className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#2a2b2b]/90 backdrop-blur-xl border border-white/15 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:border-[#f9d02d]/60 hover:text-[#f9d02d] shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Beranda</span>
          </Link>
        </nav>
      </header>

      {/* =========================================================================
          2. HERO SECTION
      ========================================================================= */}
      <section className="relative pt-32 sm:pt-40 pb-16 px-6 sm:px-10 lg:px-12 max-w-7xl mx-auto z-10">
        
        {/* Top Decorative Line */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            Kumpulan Prompt
          </span>
          <div className="h-px w-12 bg-white/20" />
        </div>

        <div className="w-full">
          {/* Main Headline */}
          <div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.04,
                    delayChildren: 0.05,
                  },
                },
              }}
              className="select-none"
            >
              <h1
                className="font-black uppercase tracking-tight leading-[0.85] text-white flex flex-wrap overflow-hidden"
                style={{ fontSize: 'clamp(4.5rem, 13vw, 11rem)' }}
              >
                {"PROMPT".split("").map((char, index) => (
                  <motion.span
                    key={`hero-p-${index}`}
                    variants={{
                      hidden: { y: '110%', opacity: 0, rotate: 2 },
                      visible: { y: '0%', opacity: 1, rotate: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
              <h1
                className="font-black uppercase tracking-tight leading-[0.85] text-[#f9d02d] mt-1 flex flex-wrap overflow-hidden"
                style={{ fontSize: 'clamp(4.5rem, 13vw, 11rem)' }}
              >
                {"GALLERY".split("").map((char, index) => (
                  <motion.span
                    key={`hero-g-${index}`}
                    variants={{
                      hidden: { y: '110%', opacity: 0, rotate: -2 },
                      visible: { y: '0%', opacity: 1, rotate: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.4 }}
              className="mt-6 text-xl sm:text-2xl font-semibold text-zinc-200 leading-snug max-w-2xl"
            >
              Kumpulan prompt foto & video yang siap dipakai.<br className="hidden sm:inline" />
              Pilih yang cocok, salin, terus mulai bikin.
            </motion.p>
          </div>
        </div>

      </section>

      {/* =========================================================================
          3. CATEGORY FILTER (Minimalist Pill Tabs)
      ========================================================================= */}
      <section className="sticky top-20 z-40 py-4 px-6 bg-[#0B0B0B]/90 backdrop-blur-xl border-y border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2">
            {FILTER_OPTIONS.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-5 py-2 rounded-full text-xs font-extrabold tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#f9d02d] text-black shadow-[0_0_20px_rgba(255,229,0,0.35)] scale-105'
                      : 'bg-[#2a2b2b] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-500">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#f9d02d]" />
            <span>Filter Kategori</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. PROMPT COLLECTION GRID
      ========================================================================= */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-12 z-10 relative">
        
        {/* Asymmetric Masonry Layout */}
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
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                  className="group relative break-inside-avoid overflow-hidden rounded-3xl bg-[#2a2b2b] border border-white/10 hover:border-[#f9d02d]/50 transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Media Frame */}
                  <div className="relative w-full overflow-hidden bg-black/40">
                    <img
                      src={item.src}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-auto object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                    />

                    {/* Dark Vignette Overlay for Crisp Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-black/30 to-black/20 opacity-60 group-hover:opacity-85 transition-opacity duration-300" />

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono font-bold uppercase text-zinc-200 border border-white/15">
                        {isVideo ? <VideoIcon className="w-3 h-3 text-[#f9d02d]" /> : <Camera className="w-3 h-3 text-[#f9d02d]" />}
                        <span>{isVideo ? 'Video' : 'Foto'}</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-full bg-[#f9d02d] text-black text-[10px] font-mono font-extrabold uppercase tracking-wider">
                        {item.aspectRatio}
                      </span>
                    </div>

                    {/* Hover Copy Action Button */}
                    <div className="absolute bottom-4 right-4 z-20">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, item.prompt, item.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-lg ${
                          isCopied
                            ? 'bg-emerald-500 text-white scale-105'
                            : 'bg-black/60 backdrop-blur-md border border-white/20 text-zinc-200 hover:text-black hover:bg-[#f9d02d] hover:border-[#f9d02d]'
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
                  <div className="p-5 bg-[#2a2b2b]">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#f9d02d] mb-1">
                      {item.category}
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-[#f9d02d] transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs text-zinc-400 line-clamp-2 font-mono leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5">
                      {item.prompt}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </main>



      {/* =========================================================================
          6. MODAL LIGHTBOX DETAIL PREVIEW
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
              className="fixed inset-0 bg-black/90 backdrop-blur-xl"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#2a2b2b] border border-white/20 shadow-2xl text-white flex flex-col lg:flex-row overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                aria-label="Tutup preview"
                className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#f9d02d] hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Media View */}
              <div className="lg:w-1/2 bg-black flex items-center justify-center relative min-h-[300px] lg:min-h-[500px]">
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
              <div className="lg:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-y-auto bg-[#2a2b2b]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#f9d02d]/20 text-[#f9d02d] text-xs font-extrabold uppercase tracking-wider">
                      {selectedItem.category}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold uppercase tracking-wider">
                      {selectedItem.model}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white leading-tight">
                    {selectedItem.title}
                  </h2>

                  {/* Main Prompt Box */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#f9d02d]" /> Teks Prompt
                      </span>
                      <button
                        onClick={(e) => handleCopy(e, selectedItem.prompt, selectedItem.id)}
                        className={`text-xs font-extrabold flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                          copiedId === selectedItem.id
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[#f9d02d] text-black hover:bg-white'
                        }`}
                      >
                        {copiedId === selectedItem.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === selectedItem.id ? 'Tersalin!' : 'Copy Prompt'}
                      </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed max-h-48 overflow-y-auto select-all">
                      {selectedItem.prompt}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">Model</p>
                      <p className="text-sm font-bold text-[#f9d02d] mt-0.5">{selectedItem.model}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">Seed Number</p>
                      <p className="text-sm font-mono font-bold text-zinc-200 mt-0.5">{selectedItem.seed}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
                  <p className="text-xs text-zinc-500 font-mono">
                    Uni-Inside Creative Studio
                  </p>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-6 py-2.5 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default PromptGalleryPage;

