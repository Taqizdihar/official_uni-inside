import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Wand2, 
  Plus, 
  ChevronDown,
  X,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react';
import { 
  generatePromptWithGemini, 
  type GeneratedPromptResult 
} from '../lib/geminiPromptService';

const RATIO_OPTIONS: ('9:16' | '1:1' | '16:9')[] = ['9:16', '1:1', '16:9'];

const STYLE_OPTIONS = [
  'Commercial Studio 8K (Hasselblad)',
  'Food & Beverage Photography (Makro Estetik)',
  'Luxury Product & Skincare (Pedestal)',
  'Cinematic 35mm Movie (Anamorphic)',
  'Haute Couture Fashion (Editorial)',
  'Clean Minimalist & Zen (Soft Shadows)',
  'Cyberpunk & Neon Noir (Night City)',
  'Landscape & National Geographic',
  'Automotive & Car Commercial',
  '3D Motion & Fluid Simulation',
  'Anime & Cinematic Concept Art',
  'Vertical Reels & TikTok Action',
];

interface GeminiPromptSectionProps {
  onAddToGallery?: (item: GeneratedPromptResult) => void;
}

interface AttachedImageState {
  file: File;
  dataUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
}

export const GeminiPromptSection: React.FC<GeminiPromptSectionProps> = ({
  onAddToGallery,
}) => {
  const [idea, setIdea] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [selectedStyle, setSelectedStyle] = useState('Commercial Studio 8K (Hasselblad)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedPromptResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [attachedImage, setAttachedImage] = useState<AttachedImageState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      setAttachedImage({
        file,
        dataUrl,
        base64,
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileProcess(file);
          break;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim() && !attachedImage) return;

    setIsGenerating(true);
    setResult(null);
    setIsAdded(false);

    try {
      const generated = await generatePromptWithGemini({
        idea: idea.trim(),
        ratio: selectedRatio,
        style: selectedStyle,
        targetAi: 'Midjourney v6.1',
        imageBase64: attachedImage?.base64,
        imageMimeType: attachedImage?.mimeType,
        imageUrl: attachedImage?.dataUrl,
        imageFileName: attachedImage?.fileName,
      });
      setResult(generated);
    } catch (err) {
      console.error('Error generating prompt:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAdd = () => {
    if (!result || !onAddToGallery) return;
    onAddToGallery(result);
    setIsAdded(true);
  };

  return (
    <section 
      id="gemini-generator"
      className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-12 lg:py-16 scroll-mt-24"
    >
      {/* ── BAGIAN ATAS: Judul & Keterangan (Digeser ke kiri 1cm) ── */}
      <div className="mb-6 sm:mb-8 text-left sm:-ml-[1cm]">
        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#202121]/60">
          AI GENERATOR
        </p>

        <h2 className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-[#202121]">
          Generate Prompt
        </h2>

        <p className="mt-3 text-base sm:text-lg text-[#202121]/75 leading-relaxed font-medium max-w-2xl">
          Describe your visual idea or upload/paste a product photo, and let AI craft studio-grade prompt formulas in an instant.
        </p>
      </div>

      {/* ── BAGIAN BAWAH: Kotak Prompt Tepat di Bawah Tulisan (Diperpanjang ke kiri 1cm) ── */}
      <div className="w-full">
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-[2rem] bg-white p-7 sm:p-9 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border transition-all sm:-ml-[1cm] sm:w-[calc(100%+1cm)] ${
            isDragging 
              ? 'border-[#f9d02d] ring-4 ring-[#f9d02d]/25 bg-[#f9d02d]/5' 
              : 'border-black/8'
          }`}
        >
          {/* Pratinjau Foto Terlampir (Vision / Image-to-Prompt) */}
          <AnimatePresence>
            {attachedImage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-3.5 rounded-2xl bg-zinc-50 border border-black/10 flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={attachedImage.dataUrl}
                      alt="Attached reference"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-black/10 shadow-sm"
                    />
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#f9d02d] text-[#202121] shadow">
                      <ImageIcon className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#202121]">
                        Vision Ready (Image-to-Prompt)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 font-bold truncate mt-0.5">
                      {attachedImage.fileName}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-medium">
                      AI will automatically read shapes, lighting, and textures without manual typing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  title="Remove attached photo"
                  className="p-2 rounded-full hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Textarea (Tinggi 4cm + Mendukung Paste Gambar Langsung) */}
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onPaste={handlePaste}
            placeholder={
              attachedImage
                ? "Photo attached! Optional: add specific visual preferences or leave blank to auto-generate from image..."
                : "Type your visual concept, or click '+ Attach Photo' / paste (Ctrl+V) an image of fruit, perfume, or products..."
            }
            rows={6}
            className="w-full p-5 rounded-2xl bg-zinc-50 border border-black/10 text-[#202121] placeholder:text-zinc-400 focus:outline-none focus:border-[#f9d02d] focus:ring-2 focus:ring-[#f9d02d]/25 transition-all text-sm sm:text-base leading-relaxed min-h-[calc(5rem+4cm)] resize-y"
          />

          {/* Controls: Upload Button + Rasio & Dropdown Lengkap */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Left Controls: Upload Button & Rasio Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Lampirkan / Unggah Foto */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                  attachedImage
                    ? 'bg-[#f9d02d] text-[#202121] border-[#f9d02d] font-black'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-[#202121] border-black/8'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{attachedImage ? 'Change Photo' : 'Attach Photo'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Rasio Pills */}
              <div className="flex items-center gap-1.5 ml-1">
                {RATIO_OPTIONS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setSelectedRatio(ratio)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      selectedRatio === ratio
                        ? 'bg-[#f9d02d] text-[#202121] shadow-sm font-black'
                        : 'bg-zinc-100 text-[#202121]/70 hover:bg-zinc-200'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Gaya Visual Lengkap */}
            <div className="relative inline-block min-w-[240px] sm:min-w-[280px]">
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 border border-black/8 text-xs font-bold text-[#202121] focus:outline-none focus:border-[#f9d02d] focus:ring-2 focus:ring-[#f9d02d]/30 transition-all cursor-pointer"
              >
                {STYLE_OPTIONS.map((st) => (
                  <option key={st} value={st} className="py-1">
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#202121]/70 pointer-events-none" />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={isGenerating || (!idea.trim() && !attachedImage)}
            onClick={handleGenerate}
            className={`mt-5 w-full py-3.5 rounded-full font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !idea.trim() && !attachedImage
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : isGenerating
                ? 'bg-[#f9d02d]/80 text-[#202121] cursor-wait'
                : 'bg-[#f9d02d] hover:bg-[#ffe14d] text-[#202121] hover:scale-[1.01] active:scale-[0.99] shadow-[0_8px_20px_rgba(249,208,45,0.4)]'
            }`}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Wand2 className="w-4 h-4" />
                </motion.div>
                <span>{attachedImage ? 'Analyzing Image & Crafting Formula...' : 'Crafting Prompt...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-[#202121]" />
                <span>{attachedImage ? 'ANALYZE PHOTO & GENERATE PROMPT' : 'GENERATE PROMPT'}</span>
              </>
            )}
          </button>

          {/* Hasil Prompt (Clean & Ringkas) */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-6 pt-5 border-t border-black/8 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    {result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt="Result source"
                        className="w-8 h-8 rounded-lg object-cover border border-black/10 shrink-0"
                      />
                    )}
                    <h4 className="text-base font-black text-[#202121] truncate">
                      {result.title}
                    </h4>
                    {result.isVisionMode && (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#f9d02d]/30 text-[#202121] text-[10px] font-extrabold uppercase">
                        Vision AI
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onAddToGallery && (
                      <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isAdded}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-[#202121]'
                        }`}
                      >
                        {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span>{isAdded ? 'Added' : 'Add to Gallery'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-4 py-1.5 rounded-full bg-[#f9d02d] hover:bg-[#ffe14d] text-[#202121] text-xs font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Box Formula Prompt */}
                <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-100 font-mono text-xs sm:text-sm leading-relaxed max-h-56 overflow-y-auto select-all whitespace-pre-line shadow-inner">
                  {result.prompt}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </section>
  );
};

export default GeminiPromptSection;
