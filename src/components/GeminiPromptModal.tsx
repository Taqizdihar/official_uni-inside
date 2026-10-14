import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Camera, 
  Sun, 
  Wand2, 
  Key, 
  Plus, 
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  generatePromptWithGemini, 
  getGeminiApiKey, 
  saveGeminiApiKey, 
  type GeneratedPromptResult 
} from '../lib/geminiPromptService';

const PRESET_IDEAS = [
  'Kopi susu gula aren dengan es batu berkilau di kafe kayu estetik',
  'Sepatu sneakers futuristik dengan aksen neon berlatar studio gelap',
  'Botol serum skincare botani di atas batu kali basah dengan embun air',
  'Mobil listrik konsep modern meluncur di jalanan kota cyberpunk malam hari',
  'Kue tart matcha artisan dengan taburan bubuk teh hijau dan bunga edible',
];

const RATIO_OPTIONS: { id: '9:16' | '16:9' | '3:4' | '1:1'; label: string; icon: string }[] = [
  { id: '9:16', label: '9:16 Reels / Potret', icon: '📱' },
  { id: '1:1', label: '1:1 Produk Kotak', icon: '⏹️' },
  { id: '3:4', label: '3:4 Editorial', icon: '🖼️' },
  { id: '16:9', label: '16:9 Lanskap', icon: '🎬' },
];

const STYLE_OPTIONS = [
  'Commercial Studio 8K',
  'Cinematic Film 35mm',
  'Editorial Fashion',
  'Clean Minimalist',
];

const TARGET_AI_OPTIONS = [
  'Midjourney v6.1',
  'Flux.1 Dev',
  'Stable Diffusion XL',
  'Runway Gen-3',
];

interface GeminiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToGallery?: (item: GeneratedPromptResult) => void;
}

export const GeminiPromptModal: React.FC<GeminiPromptModalProps> = ({
  isOpen,
  onClose,
  onAddToGallery,
}) => {
  const [idea, setIdea] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<'9:16' | '16:9' | '3:4' | '1:1'>('9:16');
  const [selectedStyle, setSelectedStyle] = useState('Commercial Studio 8K');
  const [selectedTarget, setSelectedTarget] = useState('Midjourney v6.1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedPromptResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // API Key Settings State
  const [showKeySetting, setShowKeySetting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [isKeySaved, setIsKeySaved] = useState(false);

  const handleSaveKey = () => {
    saveGeminiApiKey(apiKeyInput);
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim()) return;

    setIsGenerating(true);
    setResult(null);
    setIsAdded(false);

    try {
      const generated = await generatePromptWithGemini({
        idea: idea.trim(),
        ratio: selectedRatio,
        style: selectedStyle,
        targetAi: selectedTarget,
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 25 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-[#202121] border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8)] text-white flex flex-col my-auto"
          >
            {/* Header Ambient Glow */}
            <div
              className="absolute top-0 inset-x-0 h-44 pointer-events-none rounded-t-[2rem]"
              style={{
                background:
                  'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(249, 208, 45, 0.18) 0%, transparent 80%)',
              }}
            />

            {/* Modal Header */}
            <div className="relative p-6 sm:p-8 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#f9d02d] text-[#202121] flex items-center justify-center shadow-[0_0_20px_rgba(249,208,45,0.4)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#f9d02d]">
                      Google Gemini AI
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-zinc-300">
                      Studio Engine
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Generate Prompt Visual dengan AI
                  </h3>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Tutup"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#f9d02d] hover:text-black text-white/80 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="relative p-6 sm:p-8 space-y-6">
              
              {/* Input Area */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-2 flex items-center justify-between">
                  <span>1. Ketik Ide Visual atau Produk yang Diinginkan</span>
                  <span className="text-[11px] font-normal text-zinc-400">Bahasa Indonesia / Inggris</span>
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Contoh: Foto studio kopi susu gula aren dengan es batu berkilau di atas meja kayu kafe estetik..."
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-black/40 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-[#f9d02d] focus:ring-1 focus:ring-[#f9d02d] transition-all text-sm leading-relaxed"
                />

                {/* Preset Chips */}
                <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  <span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">Inspirasi:</span>
                  {PRESET_IDEAS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIdea(preset)}
                      className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs text-zinc-300 hover:text-white whitespace-nowrap transition-all cursor-pointer"
                    >
                      {preset.slice(0, 30)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                {/* Ratio Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                    Rasio Aspek
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {RATIO_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedRatio(opt.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          selectedRatio === opt.id
                            ? 'bg-[#f9d02d] text-[#202121] border-[#f9d02d] shadow-md'
                            : 'bg-black/30 text-zinc-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span className="truncate">{opt.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                    Gaya Visual
                  </label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[#f9d02d] cursor-pointer"
                  >
                    {STYLE_OPTIONS.map((st) => (
                      <option key={st} value={st} className="bg-[#202121]">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target AI */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                    Platform AI
                  </label>
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[#f9d02d] cursor-pointer"
                  >
                    {TARGET_AI_OPTIONS.map((ai) => (
                      <option key={ai} value={ai} className="bg-[#202121]">
                        {ai}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Generate Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isGenerating || !idea.trim()}
                  onClick={handleGenerate}
                  className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                    !idea.trim()
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                      : isGenerating
                      ? 'bg-[#f9d02d]/80 text-[#202121] cursor-wait'
                      : 'bg-[#f9d02d] hover:bg-[#ffe14d] text-[#202121] shadow-[0_8px_30px_rgba(249,208,45,0.4)] hover:shadow-[0_12px_40px_rgba(249,208,45,0.6)] hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Wand2 className="w-5 h-5" />
                      </motion.div>
                      <span>Gemini Sedang Meracik Formula...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 fill-[#202121]" />
                      <span>GENERATE DENGAN GEMINI AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Result Box */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="p-6 rounded-2xl bg-black/50 border border-[#f9d02d]/40 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f9d02d]/20 text-[#f9d02d] text-[10px] font-extrabold uppercase tracking-wider">
                          Formula Berhasil Dibuat
                        </span>
                        <h4 className="text-lg font-bold text-white mt-1">
                          {result.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {onAddToGallery && (
                          <button
                            type="button"
                            onClick={handleAdd}
                            disabled={isAdded}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                            }`}
                          >
                            {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{isAdded ? 'Ada di Galeri' : 'Ke Galeri'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleCopy}
                          className="px-4 py-2 rounded-xl bg-[#f9d02d] hover:bg-[#ffe14d] text-[#202121] text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Tersalin!' : 'Copy Prompt'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Camera & Lighting Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                        <Camera className="w-4 h-4 text-[#f9d02d] mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Kamera & Lensa</span>
                          <span className="text-zinc-200">{result.camera}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                        <Sun className="w-4 h-4 text-[#f9d02d] mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Pencahayaan</span>
                          <span className="text-zinc-200">{result.lighting}</span>
                        </div>
                      </div>
                    </div>

                    {/* Full Prompt Content */}
                    <div className="p-4 rounded-xl bg-black/70 border border-white/15 font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed max-h-52 overflow-y-auto select-all whitespace-pre-line">
                      {result.prompt}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsible API Key Drawer */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowKeySetting(!showKeySetting)}
                  className="flex items-center justify-between w-full text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#f9d02d]" />
                    <span>Konfigurasi Google Gemini API Key</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                      {getGeminiApiKey() ? 'Terhubung' : 'Mode Offline Siap'}
                    </span>
                  </span>
                  {showKeySetting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showKeySetting && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs"
                  >
                    <p className="text-zinc-400">
                      Masukkan Google Gemini API Key dari Google AI Studio. Kunci tersimpan aman di browser Anda.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 p-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-[#f9d02d]"
                      />
                      <button
                        type="button"
                        onClick={handleSaveKey}
                        className="px-4 py-2.5 rounded-lg bg-[#f9d02d] text-[#202121] font-bold text-xs hover:bg-[#ffe14d] transition-colors cursor-pointer"
                      >
                        {isKeySaved ? 'Tersimpan!' : 'Simpan'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono">Uni-Inside AI Creative Engine</span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full border border-white/20 text-white font-bold hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default GeminiPromptModal;
