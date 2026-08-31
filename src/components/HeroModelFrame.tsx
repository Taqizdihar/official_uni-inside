import { forwardRef, type PropsWithChildren } from 'react';

export const HERO_MODEL_FRAME_CLASS = 'relative w-[210%] sm:w-[250%] lg:w-[275%] h-[690px] sm:h-[870px] lg:h-[1080px] -ml-[55%] sm:-ml-[75%] lg:-ml-[87.5%] flex items-center justify-center select-none cursor-grab active:cursor-grabbing';

export const HeroModelFrame = forwardRef<HTMLDivElement, PropsWithChildren>(({ children }, ref) => (
  <div ref={ref} className={HERO_MODEL_FRAME_CLASS}>{children}</div>
));

HeroModelFrame.displayName = 'HeroModelFrame';
