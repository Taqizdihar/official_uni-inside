import { useState } from 'react';
import { Box } from 'lucide-react';

type CraftImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number | null;
  height?: number | null;
  loading?: 'eager' | 'lazy';
};

export function CraftImage({ src, alt, className = '', width, height, loading = 'lazy' }: CraftImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return (
      <div className={`flex items-center justify-center bg-[#e6e6e1] text-[#202121]/40 ${className}`} role="img" aria-label={`${alt} — image unavailable`}>
        <span className="flex flex-col items-center gap-3 text-center">
          <Box size={38} strokeWidth={1.25} aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Image unavailable</span>
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 800}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
