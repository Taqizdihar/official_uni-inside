import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Image as ImageIcon, 
  Film, 
  Smartphone, 
  Play, 
  Pause, 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  Copy, 
  Check, 
  Maximize2 
} from 'lucide-react';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const ACCENT = '#f9d02d';

type RatioKey = 'potret' | 'reels' | 'lanskap';

interface CardItem {
  id: RatioKey;
  src: string;
  videoSrc?: string;
  type: 'photo' | 'video';
  title: string;
  ratioLabel: string;
  category: string;
  prompt: string;
  Icon: typeof ImageIcon;
  className: string;
}

const CARDS: CardItem[] = [
  {
    id: 'potret',
    // Foto studio komersial buah naga estetik 9:16 Ultra HD, terpusat rapi dan bisa diputar 360°
    src: '/images/buah-naga-estetik.jpg',
    type: 'photo',
    title: 'Foto Buah Estetik',
    ratioLabel: 'Foto Buah 9:16',
    category: 'Commercial & Food',
    prompt: `Foto studio komersial Ultra HD super tajam (8k resolution, extreme crisp detail) berdasarkan buah naga segar. Pertahankan warna kulit merah muda keunguan, sisik hijau, serat putih, dan bintik biji hitam asli buah secara 100% akurat.

Rasio & Orientasi: Potret vertikal 9:16.

TATA LETAK SUBJEK & PIRING:
- Piring Utama: Piring keramik putih bundar berukuran sedang, diletakkan tepat di tengah bingkai (centered composition), memenuhi sepertiga area bawah foto.
- Isian Piring: Di dalam piring berisi kombinasi 1 buah utuh dan beberapa irisan buah segar yang tertata rapi menumpuk estetik.
- Serbet/Kain: Piring dialasi kain serbet motif kotak-kotak (gingham napkin) yang terlipat sedikit acak-alami di bawah piring. Warna motif kotak-kotak otomatis serasi dengan warna buah.
- Hiasan: Di luar piring bagian depan, ada 1 tangkai kecil daun hijau segar di atas permukaan latar putih.

LATAR BELAKANG & PENCAHAYAAN:
- Latar Belakang: Latar putih bertekstur kain/kertas halus yang sangat bersih.
- Pencahayaan: High-key studio lighting yang terang, menonjolkan tekstur basah daging buah tanpa bayangan gelap.

SPESIFIKASI KAMERA & KUALITAS HD:
- Shot on Hasselblad H6D-100c, lensa 120mm f/4 Macro, sudut 45 derajat (high-angle close-up).
- Fokus ultra-tajam, High Definition (HD crisp micro-details), serat daging buah sangat jelas, pore-level texture, kilap embun air realistis, tanpa efek CGI/plastik AI. --ar 9:16 --v 6.1 --style raw`,
    Icon: ImageIcon,
    className: 'col-span-1 h-[290px] sm:h-[350px]',
  },
  {
    id: 'reels',
    // Video reels vertikal 9:16 aktif berputar secara mulus & responsif
    src: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=85',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    type: 'video',
    title: 'Cinematic Reels Video',
    ratioLabel: '9:16 Reels',
    category: 'Vertical Motion',
    prompt: 'Vertical 9:16 ultra-cinematic action sequence in high-energy lighting, neon speed streaks, dynamic camera dolly zoom, crisp 60fps 4k broadcast video',
    Icon: Smartphone,
    className: 'col-span-1 h-[290px] sm:h-[350px]',
  },
  {
    id: 'lanskap',
    // Foto pendaki menjelajah pegunungan dengan panorama utuh tidak terpotong
    src: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=85',
    type: 'photo',
    title: 'Mountain Explorer Expedition',
    ratioLabel: '16:9 Landscape',
    category: 'Outdoor & Adventure',
    prompt: 'Cinematic wide angle landscape of two backpackers hiking along rugged mountain trail toward majestic snowy peaks, moody atmospheric fog, National Geographic photography',
    Icon: Film,
    className: 'col-span-2 h-[210px] sm:h-[255px]',
  },
];

export const PromptGalleryTeaser: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);

  // Video Reels State
  const [isPlayingReel, setIsPlayingReel] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const reelVideoRef = useRef<HTMLVideoElement>(null);

  // Foto Produk 3D Turntable / Rotation State (Bisa Diputar!)
  const [photoRotY, setPhotoRotY] = useState(0);
  const [photoRotX, setPhotoRotX] = useState(0);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initRotY: number; initRotX: number }>({
    startX: 0,
    startY: 0,
    initRotY: 0,
    initRotX: 0,
  });

  // Autoplay video reel saat in-view
  useEffect(() => {
    if (inView && reelVideoRef.current && isPlayingReel) {
      reelVideoRef.current.play().catch(() => {
        // Fallback jika autoplay dibatasi browser
      });
    }
  }, [inView, isPlayingReel]);

  const toggleReelPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reelVideoRef.current) return;
    if (reelVideoRef.current.paused) {
      reelVideoRef.current.play();
      setIsPlayingReel(true);
    } else {
      reelVideoRef.current.pause();
      setIsPlayingReel(false);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reelVideoRef.current) return;
    reelVideoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handler putar 360 derajat foto produk
  const handleSpinPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoRotY((prev) => prev + 360);
    setPhotoRotX(0);
  };

  // Drag rotation handlers untuk foto produk
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingPhoto(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initRotY: photoRotY,
      initRotX: photoRotX,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPhoto) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    setPhotoRotY(dragStartRef.current.initRotY + deltaX * 0.9);
    setPhotoRotX(Math.max(-25, Math.min(25, dragStartRef.current.initRotX - deltaY * 0.4)));
  };

  const handleMouseUp = () => {
    setIsDraggingPhoto(false);
  };

  // Touch drag untuk mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDraggingPhoto(true);
    dragStartRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      initRotY: photoRotY,
      initRotX: photoRotX,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingPhoto || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartRef.current.startX;
    const deltaY = e.touches[0].clientY - dragStartRef.current.startY;
    setPhotoRotY(dragStartRef.current.initRotY + deltaX * 0.9);
    setPhotoRotX(Math.max(-25, Math.min(25, dragStartRef.current.initRotX - deltaY * 0.4)));
  };

  const handleTouchEnd = () => {
    setIsDraggingPhoto(false);
  };

  const copyPromptText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section
      ref={ref}
      id="prompt-gallery"
      className="relative w-full text-white py-28 lg:py-40 overflow-hidden"
      style={{ background: '#202121' }}
      onMouseUp={handleMouseUp}
    >
      {/* Ambient glow lembut */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 20% 50%, rgba(249, 208, 45, 0.12) 0%, transparent 75%)',
        }}
      />

      {/* Kontainer utama dengan jarak 8cm di kiri dan kanan pada layar desktop */}
      <div className="relative w-full px-6 sm:px-10 lg:px-16 xl:px-[8cm]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-center w-full">
          
          {/* ── KIRI: Teks & CTA (7 kolom) ── */}
          <div className="lg:col-span-7 xl:col-span-7 order-1 flex flex-col justify-center">
            <motion.div
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
              }}
              className="select-none"
            >
              <h2
                className="font-black uppercase tracking-tighter text-white leading-[0.82] flex flex-nowrap whitespace-nowrap overflow-hidden"
                style={{ fontSize: 'clamp(5rem, 8.8vw, 9.6rem)' }}
              >
                {'PROMPT'.split('').map((char, i) => (
                  <motion.span
                    key={`p-${i}`}
                    variants={{
                      hidden: { y: '110%', opacity: 0, rotate: 3 },
                      visible: {
                        y: '0%',
                        opacity: 1,
                        rotate: 0,
                        transition: { duration: 0.6, ease: EASE },
                      },
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </h2>
              <h2
                className="font-black uppercase tracking-tighter leading-[0.82] mt-1 flex flex-nowrap whitespace-nowrap overflow-hidden"
                style={{ fontSize: 'clamp(5rem, 8.8vw, 9.6rem)', color: ACCENT }}
              >
                {'GALLERY'.split('').map((char, i) => (
                  <motion.span
                    key={`g-${i}`}
                    variants={{
                      hidden: { y: '110%', opacity: 0, rotate: -3 },
                      visible: {
                        y: '0%',
                        opacity: 1,
                        rotate: 0,
                        transition: { duration: 0.6, ease: EASE },
                      },
                    }}
                    className="inline-block"
                  >
                    {char}
                  </motion.span>
                ))}
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: 0.45, duration: 0.55, ease: EASE }}
              className="text-white font-extrabold leading-snug mt-6 sm:mt-8"
              style={{ fontSize: 'clamp(1.25rem, 2.3vw, 1.65rem)' }}
            >
              A curated collection of ready-to-use photo &amp; video prompts.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: 0.55, duration: 0.55, ease: EASE }}
              className="text-gray-300 text-base sm:text-lg leading-relaxed mt-4 max-w-xl font-medium"
            >
              Aesthetic commercial fruit &amp; product photography with seamless 360° interactive rotation,
              active auto-playing reels, and cinematic landscapes.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: 0.65, duration: 0.55, ease: EASE }}
              className="mt-9 sm:mt-10 flex flex-wrap items-center gap-4"
            >
              <Link to="/prompt-gallery" className="inline-block">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-3 rounded-full font-extrabold text-base text-[#202121] cursor-pointer shadow-xl hover:shadow-[0_15px_35px_rgba(249,208,45,0.4)] transition-all duration-300"
                  style={{ background: ACCENT, padding: '1.1rem 2.5rem', letterSpacing: '0.05em' }}
                >
                  <span>VIEW COLLECTION</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Link>

              <Link to="/prompt-gallery" className="inline-block">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2.5 rounded-full font-extrabold text-sm sm:text-base text-[#f9d02d] border border-[#f9d02d]/40 bg-white/5 hover:bg-[#f9d02d]/10 cursor-pointer shadow-lg transition-all duration-300"
                  style={{ padding: '1.1rem 2rem', letterSpacing: '0.05em' }}
                >
                  <Sparkles className="w-4 h-4 fill-[#f9d02d]" />
                  <span>AI GEMINI GENERATOR</span>
                </motion.div>
              </Link>
            </motion.div>
          </div>

          {/* ── KANAN: Mosaik kartu interaktif seimbang (2 kolom) ── */}
          <div className="lg:col-span-5 xl:col-span-5 order-2 w-full">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-[620px] mx-auto lg:ml-auto relative">
              
              {/* ── KARTU 1: FOTO PRODUK (TIDAK KEPOTONG + BISA DIPUTAR 360°) ── */}
              {(() => {
                const card = CARDS[0];
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={
                      inView
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 40, scale: 0.96 }
                    }
                    transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
                    className={`${card.className} relative rounded-[1.75rem] overflow-hidden bg-[#181818] border border-white/10 hover:border-[#f9d02d] transition-all duration-300 group shadow-[0_20px_45px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_60px_rgba(249,208,45,0.35)] flex flex-col justify-between select-none`}
                    style={{ perspective: 1000 }}
                  >
                    {/* Interactive 3D Canvas / Rotatable Image - Tidak Kepotong */}
                    <div
                      className="absolute inset-0 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <motion.div
                        className="w-full h-full flex items-center justify-center pointer-events-none"
                        animate={{
                          rotateY: photoRotY,
                          rotateX: photoRotX,
                        }}
                        transition={
                          isDraggingPhoto
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 120, damping: 20 }
                        }
                        style={{
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {/* Foto Buah Estetik 9:16 Ultra HD, terpusat rapi tanpa terpotong */}
                        <img
                          src={card.src}
                          alt={card.title}
                          draggable={false}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </motion.div>
                    </div>

                    {/* Subtle vignette overlay untuk kontras badge & label */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

                    {/* Top Badges & Controls: Tombol Putar 360° */}
                    <div className="relative z-10 p-3.5 flex items-center justify-between w-full">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#f9d02d] shadow-md pointer-events-none">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {card.ratioLabel}
                      </span>

                      {/* Tombol Putar 360° Interaktif */}
                      <button
                        type="button"
                        onClick={handleSpinPhoto}
                        title="Rotate Photo 360°"
                        className="w-8 h-8 rounded-full bg-black/80 hover:bg-[#202121] text-[#f9d02d] border border-[#f9d02d]/40 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer group/btn"
                      >
                        <RotateCw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
                      </button>
                    </div>

                    {/* Bottom Info Title + Hint Bisa Diputar */}
                    <div 
                        className="relative z-10 p-4 cursor-pointer"
                        onClick={() => setSelectedCard(card)}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f9d02d] animate-pulse" />
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f9d02d]">
                          360° Interactive View
                        </p>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-wide drop-shadow-md group-hover:text-[#f9d02d] transition-colors duration-300">
                        {card.title}
                      </h4>
                    </div>
                  </motion.div>
                );
              })()}

              {/* ── KARTU 2: VIDEO REELS (AKTIF BERPUTAR + AUDIO & PLAY/PAUSE) ── */}
              {(() => {
                const card = CARDS[1];
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={
                      inView
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 40, scale: 0.96 }
                    }
                    transition={{ duration: 0.7, delay: 0.27, ease: EASE }}
                    whileHover={{ scale: 1.025, y: -4 }}
                    className={`${card.className} relative rounded-[1.75rem] overflow-hidden bg-[#161616] border border-white/10 hover:border-[#f9d02d] transition-all duration-300 group shadow-[0_20px_45px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_60px_rgba(249,208,45,0.3)] flex flex-col justify-between`}
                  >
                    {/* Video Reels yang aktif berputar loop secara halus */}
                    <div 
                      className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-black cursor-pointer"
                      onClick={() => setSelectedCard(card)}
                    >
                      <video
                        ref={reelVideoRef}
                        src={card.videoSrc}
                        poster={card.src}
                        autoPlay
                        loop
                        muted={isMuted}
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

                    {/* Top Badges & Controls: Play/Pause + Audio Mute */}
                    <div className="relative z-10 p-3.5 flex items-center justify-between w-full">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#f9d02d] shadow-md pointer-events-none">
                        <Smartphone className="w-3.5 h-3.5" />
                        {card.ratioLabel}
                      </span>

                      {/* Kontrol Putar Reels & Suara */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={toggleSound}
                          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                          className="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          {isMuted ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3 text-[#f9d02d]" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={toggleReelPlay}
                          title={isPlayingReel ? 'Pause Reel' : 'Play Reel'}
                          className="w-8 h-8 rounded-full bg-[#f9d02d] text-[#202121] flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          {isPlayingReel ? (
                            <Pause className="w-3.5 h-3.5 fill-[#202121]" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-[#202121] ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bottom Info Title + Live Indicator */}
                    <div 
                      className="relative z-10 p-4 cursor-pointer"
                      onClick={() => setSelectedCard(card)}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isPlayingReel ? 'bg-red-500 animate-ping' : 'bg-zinc-500'}`} />
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f9d02d]">
                          {isPlayingReel ? 'Reel Playing' : 'Reel Paused'}
                        </p>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-wide drop-shadow-md group-hover:text-[#f9d02d] transition-colors duration-300">
                        {card.title}
                      </h4>

                      {/* Animated Progress Line di bawah */}
                      <div className="w-full bg-white/20 h-0.5 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full bg-[#f9d02d] ${isPlayingReel ? 'animate-[pulse_1.5s_ease-in-out_infinite] w-3/4' : 'w-1/3'}`} />
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* ── KARTU 3: PENDAKI MENJELAJAH GUNUNG (16:9 LANSKAP PENUH) ── */}
              {(() => {
                const card = CARDS[2];
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 40, scale: 0.96 }}
                    animate={
                      inView
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 40, scale: 0.96 }
                    }
                    transition={{ duration: 0.7, delay: 0.39, ease: EASE }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    onClick={() => setSelectedCard(card)}
                    className={`${card.className} relative rounded-[1.75rem] overflow-hidden bg-[#181818] border border-white/10 hover:border-[#f9d02d] transition-all duration-300 group cursor-pointer shadow-[0_20px_45px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_60px_rgba(249,208,45,0.25)] flex flex-col justify-between`}
                  >
                    {/* Landscape Image */}
                    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black/40">
                      <img
                        src={card.src}
                        alt={card.title}
                        loading="lazy"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 opacity-75 group-hover:opacity-85 transition-opacity duration-300 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="relative z-10 p-3.5 flex items-center justify-between w-full pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#f9d02d] shadow-md">
                        <Film className="w-3.5 h-3.5" />
                        {card.ratioLabel}
                      </span>

                      <span className="w-8 h-8 rounded-full bg-black/60 text-white/80 group-hover:text-[#f9d02d] flex items-center justify-center transition-colors">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Bottom Info Title */}
                    <div className="relative z-10 p-4">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f9d02d] mb-0.5">
                        {card.category}
                      </p>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-wide drop-shadow-md group-hover:text-[#f9d02d] transition-colors duration-300">
                        {card.title}
                      </h4>
                    </div>
                  </motion.div>
                );
              })()}

            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL LIGHTBOX PREVIEW DETAIL DENGAN PUTAR PENUH ── */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 lg:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-xl"
            />

            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#202121] border border-white/20 shadow-2xl text-white flex flex-col md:flex-row overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedCard(null)}
                aria-label="Close preview"
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#f9d02d] hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Media View (Video Player atau Foto Penuh Tidak Terpotong) */}
              <div className="md:w-1/2 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[460px] p-4">
                {selectedCard.type === 'video' && selectedCard.videoSrc ? (
                  <video
                    src={selectedCard.videoSrc}
                    poster={selectedCard.src}
                    controls
                    autoPlay
                    loop
                    className="max-h-[65vh] w-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={selectedCard.src}
                      alt={selectedCard.title}
                      className="max-h-[65vh] w-full object-contain drop-shadow-2xl"
                    />
                  </div>
                )}

                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-xs font-mono font-bold text-[#f9d02d] border border-white/10">
                    {selectedCard.ratioLabel}
                  </span>
                </div>
              </div>

              {/* Prompt Detail Column */}
              <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[#242525]">
                <div>
                  <h3 className="text-2xl font-black text-white leading-tight pr-6">
                    {selectedCard.title}
                  </h3>

                  {/* Formula Prompt Box */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#f9d02d]" /> Formula Prompt
                      </p>
                      <button
                        onClick={() => copyPromptText(selectedCard.prompt)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f9d02d] hover:underline cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-zinc-200 leading-relaxed max-h-36 overflow-y-auto select-all">
                      {selectedCard.prompt}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <Link
                    to="/prompt-gallery"
                    className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#f9d02d] hover:underline"
                  >
                    <span>View Full Gallery</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => setSelectedCard(null)}
                    className="px-5 py-2 rounded-full border border-white/20 text-xs font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default PromptGalleryTeaser;
