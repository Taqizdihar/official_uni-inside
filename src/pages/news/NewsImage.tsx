import { useState } from 'react';
import type { NewsImageData } from './newsModel';

export function NewsImage({ image, alt, className = '', preview = false, eager = false }: { image?: NewsImageData | null; alt: string; className?: string; preview?: boolean; eager?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasImage = Boolean(image?.secure_url && failedUrl !== image.secure_url);
  return <div className={`relative overflow-hidden bg-[#dcdcd7] ${className}`}>
    {hasImage ? <img src={image!.secure_url} alt={image?.alt_text || alt} width={image?.width_px || 1200} height={image?.height_px || 800} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(image!.secure_url)} className={`absolute inset-0 h-full w-full ${preview ? 'object-contain p-7 sm:p-10' : 'object-cover'}`} />
      : <div className="absolute inset-0 flex flex-col justify-between border border-[#202121]/15 bg-[#dcdcd7] p-6 text-[#202121]" role="img" aria-label={`${alt} — no cover image available`}><span className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#202121]/50">Uni-Inside / News</span><span className="max-w-[10ch] text-[clamp(2rem,5vw,5rem)] font-black leading-[.85] tracking-[-.07em] text-[#202121]/18" aria-hidden="true">A STORY WITHOUT A COVER</span><span className="h-px w-full bg-[#202121]/20" aria-hidden="true" /></div>}
  </div>;
}
