export type PromptVisualTone = 'neon' | 'gold' | 'editorial' | 'solarpunk' | 'mineral' | 'cosmos';

export interface GalleryPrompt {
  id: string;
  title: string;
  category: string;
  format: 'Image' | 'Motion';
  aspectRatio: '9:16' | '3:4' | '16:9' | '21:9';
  prompt: string;
  negativePrompt?: string;
  tags: string[];
  visualTone: PromptVisualTone;
  visualLabel: string;
}

// Selected, self-contained prompts adapted from anggi. The artwork shown in the UI
// is an abstract local preview of each theme, never a claimed generation result.
export const promptGalleryData: GalleryPrompt[] = [
  {
    id: 'neon-samurai',
    title: 'Neon Cyberpunk Samurai',
    category: 'Character & Sci-Fi',
    format: 'Image',
    aspectRatio: '9:16',
    prompt: 'Hyper-detailed futuristic cyberpunk warrior standing under volumetric neon rain, reflective chrome armor, glowing katana blade emitting cyan sparks, holographic visor with kanji HUD, dark alley in Neo-Tokyo, octane render, 8k resolution, cinematic lighting, photorealistic, 35mm photography --ar 9:16 --v 6.1 --style raw',
    negativePrompt: 'blurry, low quality, oversaturated, deformed hands, bad anatomy, cartoon, watermark',
    tags: ['Cyberpunk', 'Portrait', 'Sci-Fi', 'Neon'],
    visualTone: 'neon',
    visualLabel: 'NEON / CITY',
  },
  {
    id: 'liquid-gold',
    title: 'Kinetic Liquid Gold',
    category: 'Motion & Abstract',
    format: 'Motion',
    aspectRatio: '16:9',
    prompt: 'Cinematic slow motion fluid dynamics, molten gold and obsidian black viscous liquid colliding in zero gravity, micro bubbles, radiant specular highlights, studio rim lighting, 4k 60fps macro slowmo, photorealistic physics, pristine reflection',
    negativePrompt: 'pixelated, jerky movement, flickering, low frame rate, noisy render',
    tags: ['Fluid Simulation', 'Liquid Gold', 'Abstract', '3D Motion'],
    visualTone: 'gold',
    visualLabel: 'MOLTEN / FORM',
  },
  {
    id: 'solar-editorial',
    title: 'Ethereal Solar Editorial',
    category: 'Fashion & Editorial',
    format: 'Image',
    aspectRatio: '3:4',
    prompt: 'Haute couture editorial portrait of an ethereal goddess bathed in golden hour sunlight, woven amber halo crown, flowing silk translucent dress caught in sea breeze, glowing skin, soft focus lens bokeh, Vogue cover style, shot on Hasselblad H6D-100c, sharp detail --ar 3:4 --v 6.1',
    negativePrompt: 'extra limbs, bad eyes, poorly drawn face, plastic skin, mutation',
    tags: ['Editorial', 'Portrait', 'Haute Couture', 'Golden Hour'],
    visualTone: 'editorial',
    visualLabel: 'GOLDEN / HOUR',
  },
  {
    id: 'solarpunk-city',
    title: 'Solarpunk Metropolis',
    category: 'Architecture & World Building',
    format: 'Image',
    aspectRatio: '16:9',
    prompt: 'Ultra-wide angle aerial panoramic view of a lush sustainable solarpunk city in year 2150, bioluminescent sky gardens, curved organic glass skyscrapers, flying magnetic transit vehicles weaving between vertical forests, crystal clear waterfalls cascading down skyscrapers, dramatic volumetric god rays --ar 16:9 --style raw',
    negativePrompt: 'foggy, smog, ruined buildings, dystopian, low poly, oversaturated, text',
    tags: ['Solarpunk', 'Architecture', 'Futuristic', 'Landscape'],
    visualTone: 'solarpunk',
    visualLabel: 'LIVING / CITY',
  },
  {
    id: 'mineral-sculpture',
    title: 'Monolithic Mineral Sculpture',
    category: 'Product & Design',
    format: 'Image',
    aspectRatio: '3:4',
    prompt: 'Minimalist industrial design object crafted from raw black granite, polished obsidian glass, and brushed champagne gold geometric accents, floating in negative space, soft shadow casting, museum pedestal lighting, Leica SL2, 90mm f/2.8, Hasselblad natural color solution',
    negativePrompt: 'busy background, dusty, scratched texture, cartoon, cheap 3d look',
    tags: ['Product Design', 'Minimalism', 'Studio Lighting', 'Luxury'],
    visualTone: 'mineral',
    visualLabel: 'STUDIO / FORM',
  },
  {
    id: 'cosmic-nebula',
    title: 'Cosmic Nebula Exploration',
    category: 'Space & VFX',
    format: 'Motion',
    aspectRatio: '21:9',
    prompt: 'Ultrawide cinematic camera gliding through a luminous purple and gold interstellar nebula, star birth cluster with sparkling stellar dust, gravitational light distortion, lens flare, James Webb space telescope aesthetic, 60fps smooth glide, ultra photorealistic',
    negativePrompt: 'flat texture, 2d painting, artifacts, pixel noise, jump cuts',
    tags: ['Space', 'Nebula', 'Ultrawide 21:9', 'Sci-Fi'],
    visualTone: 'cosmos',
    visualLabel: 'COSMIC / FLIGHT',
  },
];
