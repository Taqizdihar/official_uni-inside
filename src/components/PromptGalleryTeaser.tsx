import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Image as ImageIcon, Film, Smartphone } from 'lucide-react';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Warna selaras dengan seluruh situs: aksen #f9d02d, kartu #2a2b2b, latar #202121.
const ACCENT = '#f9d02d';

type RatioKey = 'potret' | 'reels' | 'lanskap';

const CARDS: {
  id: RatioKey;
  src: string;
  title: string;
  ratioLabel: string;
  Icon: typeof ImageIcon;
  className: string;
  floatY: number[];
  floatRotate: number[];
  floatDuration: number;
  floatDelay: number;
}[] = [
  {
    id: 'potret',
    src: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=90',
    title: 'Potret Studio',
    ratioLabel: '3:4 Potret',
    Icon: ImageIcon,
    className: 'col-span-3 aspect-[3/4]',
    floatY: [0, -14, 0],
    floatRotate: [-1, 1.5, -1],
    floatDuration: 5.5,
    floatDelay: 0,
  },
  {
    id: 'reels',
    src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=90',
    title: 'Reels Cyber Neon',
    ratioLabel: '9:16 Reels',
    Icon: Smartphone,
    className: 'col-span-2 aspect-[9/16]',
    floatY: [0, 12, 0],
    floatRotate: [1, -2, 1],
    floatDuration: 6.8,
    floatDelay: 0.5,
  },
  {
    id: 'lanskap',
    src: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=90',
    title: 'Lanskap Sinematik 3D',
    ratioLabel: '16:9 Lanskap',
    Icon: Film,
    className: 'col-span-5 aspect-[16/9]',
    floatY: [0, -10, 0],
    floatRotate: [0.5, -1, 0.5],
    floatDuration: 6.2,
    floatDelay: 1.0,
  },
];

export const PromptGalleryTeaser: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      id="prompt-gallery"
      className="relative w-full text-white py-28 lg:py-40 overflow-hidden"
      style={{ background: '#202121' }}
    >
      {/* Ambient glow ringan, senada dengan AchievementsSection */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 20% 50%, rgba(249, 208, 45, 0.12) 0%, transparent 75%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-28 items-center">
          {/* ── KIRI: Teks & CTA (7 kolom) ── */}
          <div className="lg:col-span-7 order-1 flex flex-col justify-center">
            {/* Headline Ekstra Besar Raksasa Tanpa Break Spasi (2 Baris Rapi) */}
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
                className="font-black uppercase tracking-tighter text-white leading-[0.85] flex flex-nowrap whitespace-nowrap overflow-hidden"
                style={{ fontSize: 'clamp(4.2rem, 7.2vw, 7.5rem)' }}
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
                className="font-black uppercase tracking-tighter leading-[0.85] mt-1 flex flex-nowrap whitespace-nowrap overflow-hidden"
                style={{ fontSize: 'clamp(4.2rem, 7.2vw, 7.5rem)', color: ACCENT }}
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
              style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.55rem)' }}
            >
              Kumpulan prompt foto &amp; video yang siap dipakai.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: 0.55, duration: 0.55, ease: EASE }}
              className="text-gray-300 text-base sm:text-lg leading-relaxed mt-4 max-w-lg font-medium"
            >
              Dari potret studio, lanskap, sampai format reels. Salin, tempel ke tool
              favoritmu, lalu tinggal sesuaikan sama gayamu sendiri.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: 0.65, duration: 0.55, ease: EASE }}
              className="mt-9 sm:mt-10"
            >
              <Link to="/prompt-gallery" className="inline-block">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-3 rounded-full font-extrabold text-base text-[#202121] cursor-pointer shadow-xl hover:shadow-[0_15px_35px_rgba(249,208,45,0.4)] transition-all duration-300"
                  style={{ background: ACCENT, padding: '1.1rem 2.5rem', letterSpacing: '0.05em' }}
                >
                  <span>LIHAT KOLEKSINYA</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Link>
            </motion.div>
          </div>

          {/* ── KANAN: Mosaik kartu kolase (5 kolom) ── */}
          <div className="lg:col-span-5 order-2 w-full">
            <div className="grid grid-cols-5 gap-4 max-w-[480px] mx-auto lg:ml-auto relative">
              {CARDS.map((card, idx) => {
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={
                      inView
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 50, scale: 0.95 }
                    }
                    transition={{
                      duration: 0.8,
                      delay: 0.15 + idx * 0.15,
                      ease: EASE,
                    }}
                    whileHover={{
                      scale: 1.03,
                      y: -6,
                      transition: { duration: 0.35, ease: 'easeOut' },
                    }}
                    className={`${card.className} relative rounded-3xl overflow-hidden bg-[#2a2b2b] border border-white/10 hover:border-[#f9d02d] transition-all duration-500 group cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:shadow-[0_25px_65px_rgba(249,208,45,0.28)]`}
                  >
                    {/* Lapisan mengambang halus zero-gravity */}
                    <motion.div
                      className="absolute inset-0 w-full h-full"
                      animate={{ y: card.floatY, rotate: card.floatRotate }}
                      transition={{
                        y: {
                          duration: card.floatDuration,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: card.floatDelay,
                        },
                        rotate: {
                          duration: card.floatDuration,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: card.floatDelay,
                        },
                      }}
                    >
                      {/* Zoom lambat (Ken Burns) & Hover Zoom */}
                      <motion.img
                        src={card.src}
                        alt={card.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{
                          duration: 10 + idx * 2,
                          repeat: Infinity,
                          repeatType: 'mirror',
                          ease: 'easeInOut',
                        }}
                      />
                    </motion.div>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

                    {/* Glossy Shimmer Beam on Hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transform" />

                    {/* Label Format */}
                    <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#f9d02d] shadow-md">
                      <card.Icon className="w-3.5 h-3.5" />
                      {card.ratioLabel}
                    </span>

                    {/* Judul di Kiri Bawah */}
                    <div className="absolute bottom-3.5 left-3.5">
                      <span className="text-xs sm:text-sm font-bold text-white tracking-wide drop-shadow-md group-hover:text-[#f9d02d] transition-colors duration-300">
                        {card.title}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromptGalleryTeaser;

