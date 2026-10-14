import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Video as VideoIcon, 
  Copy, 
  Check, 
  Sparkles, 
  X, 
  SlidersHorizontal
} from 'lucide-react';
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

export const PromptGalleryGrid: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [selectedItem, setSelectedItem] = useState<PromptGalleryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full text-white">
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {FILTER_OPTIONS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-5 py-2 rounded-full text-xs font-extrabold tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FFE500] text-black shadow-[0_0_20px_rgba(255,229,0,0.35)] scale-105'
                    : 'bg-[#141414] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#FFE500]" />
          <span>{filteredItems.length} PROMPTS</span>
        </div>
      </div>

      {/* Adaptive Gallery Grid */}
      <motion.div 
        layout
        className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, index) => {
            const isVideo = item.type === 'video';
            const isCopied = copiedId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                className="group relative break-inside-avoid overflow-hidden rounded-3xl bg-[#141414] border border-white/10 hover:border-[#FFE500]/50 transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedItem(item)}
              >
                {/* Media Container */}
                <div className="relative w-full overflow-hidden bg-black/40">
                  <img
                    src={item.src}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-black/30 to-black/20 opacity-60 group-hover:opacity-85 transition-opacity duration-300" />

                  {/* Floating Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono font-bold uppercase text-zinc-200 border border-white/15">
                      {isVideo ? <VideoIcon className="w-3 h-3 text-[#FFE500]" /> : <Camera className="w-3 h-3 text-[#FFE500]" />}
                      <span>{isVideo ? 'Video' : 'Foto'}</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-full bg-[#FFE500] text-black text-[10px] font-mono font-extrabold uppercase tracking-wider">
                      {item.aspectRatio}
                    </span>
                  </div>

                  {/* Hover Copy Action Button */}
                  <div className="absolute bottom-4 right-4 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.prompt, item.id);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-lg ${
                        isCopied
                          ? 'bg-emerald-500 text-white scale-105'
                          : 'bg-black/60 backdrop-blur-md border border-white/20 text-zinc-200 hover:text-black hover:bg-[#FFE500] hover:border-[#FFE500]'
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

                {/* Content Section */}
                <div className="p-5 bg-[#141414]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFE500] mb-1">
                    {item.category}
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-[#FFE500] transition-colors">
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

      {/* Lightbox / Detail Modal */}
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
              className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141414] border border-white/20 shadow-2xl text-white flex flex-col lg:flex-row overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                aria-label="Tutup preview"
                className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#FFE500] hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Media Preview Column */}
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
                  <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-[#FFE500] border border-white/10">
                    {selectedItem.aspectRatio} • {selectedItem.orientation}
                  </span>
                </div>
              </div>

              {/* Information & Prompt Column */}
              <div className="lg:w-1/2 p-6 sm:p-8 lg:p-10 flex flex-col justify-between overflow-y-auto bg-[#141414]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#FFE500]/20 text-[#FFE500] text-xs font-extrabold uppercase tracking-wider">
                      {selectedItem.category}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold uppercase tracking-wider">
                      {selectedItem.model}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white leading-tight">
                    {selectedItem.title}
                  </h2>

                  {/* Main Prompt */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFE500]" /> Generation Prompt
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedItem.prompt, selectedItem.id)}
                        className={`text-xs font-extrabold flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                          copiedId === selectedItem.id 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[#FFE500] text-black hover:bg-white'
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

                  {/* Metadata Specs */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">AI Model</p>
                      <p className="text-sm font-bold text-[#FFE500] mt-0.5">{selectedItem.model}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] uppercase font-mono font-bold text-zinc-400 tracking-wider">Seed Number</p>
                      <p className="text-sm font-mono font-bold text-zinc-200 mt-0.5">{selectedItem.seed}</p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
                  <p className="text-xs text-zinc-500 font-mono">
                    Koleksi resmi Uni-Inside Media Kit & Creative Studio.
                  </p>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-5 py-2 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromptGalleryGrid;
