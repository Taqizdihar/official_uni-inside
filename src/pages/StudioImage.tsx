import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { StudioImage as ImageData } from './studioService';

export function StudioImage({ image, alt, className = '', eager = false }: { image?: ImageData | null; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!image?.secure_url || failed === image.secure_url) {
    return <div className={`flex items-center justify-center bg-[#d9d9d3] text-[#202121]/45 ${className}`} role="img" aria-label={`${alt} — image unavailable`}>
      <span className="flex flex-col items-center gap-3 text-center"><ImageOff size={36} strokeWidth={1.25} aria-hidden="true" /><span className="text-[10px] font-bold uppercase tracking-[.16em]">Image unavailable</span></span>
    </div>;
  }
  return <img src={image.secure_url} alt={image.alt_text || alt} width={image.width_px || 900} height={image.height_px || 700} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(image.secure_url)} className={className} />;
}
