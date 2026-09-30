export interface PromptGalleryItem {
  id: string;
  title: string;
  category: string;
  type: 'photo' | 'video';
  orientation: 'portrait' | 'landscape';
  aspectRatio: '9:16' | '3:4' | '16:9' | '21:9' | '1:1';
  prompt: string;
  negativePrompt?: string;
  model: string;
  seed: string;
  src: string;
  videoSrc?: string;
  duration?: string;
  tags: string[];
}

export const promptGalleryData: PromptGalleryItem[] = [
  {
    id: 'pg-fruit-aesthetic',
    title: 'Foto Buah Estetik',
    category: 'Commercial & Food Photography',
    type: 'photo',
    orientation: 'portrait',
    aspectRatio: '9:16',
    prompt: `Foto studio komersial Ultra HD super tajam (8k resolution, extreme crisp detail) berdasarkan buah pada gambar terlampir. Pertahankan warna kulit, serat, dan bentuk asli buah secara 100% akurat.

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
    negativePrompt: 'blurry, low quality, dark shadows, heavy contrast, plastic look, CGI render, cartoon, extra objects, oversaturated, deformed plate, dirty background, watermark',
    model: 'Hasselblad Macro / Midjourney v6.1',
    seed: '782194031',
    src: '/images/buah-naga-estetik.jpg',
    tags: ['Foto Buah Estetik', 'Buah Naga', 'Food Photography', 'Commercial Studio', '9:16', 'Hasselblad'],
  },
  {
    id: 'pg-parfum-miss-dior',
    title: 'Foto Studio Parfum',
    category: 'Luxury Product',
    type: 'photo',
    orientation: 'portrait',
    aspectRatio: '3:4',
    prompt: `Foto studio komersial produk parfum profesional Ultra HD 8K super tajam (hyper-detailed, crisp focus, extreme clarity) yang mengunci 100% presisi produk dari gambar terlampir. DILARANG MENGUBAH ATAU MENGMODIFIKASI bentuk botol, tekstur kaca bening, warna cairan di dalam botol, warna dan bentuk tutup botol, serta posisi selang penyemprot dari foto referensi.

RASIO & BINGKAI:
- Orientasi Potret Vertikal Rasio 3:4.
- Komposisi Simetris: Botol parfum diletakkan tepat di titik pusat bingkai (dead center) pada jarak menengah (medium shot), berdiri tegak lurus secara vertikal.

SUBJEK UTAMA & DEKORASI TERKUNCI:
- Botol Parfum Utama: Terletak di tengah, terbuat dari kaca tebal transparan dengan kilauan alami, berisi cairan parfum sesuai foto referensi.
- Alas Kain Sutra: Botol berdiri di atas lipatan kain sutra satin halus yang mengalir secara alami. Warna kain DILOCK serasi dengan warna cairan parfum pada gambar terlampir (tone-on-tone matching).
- Bunga & Aksesoris: Ditata secara simetris di sisi kiri dan kanan botol—terdiri dari bunga peoni/mawar putih yang mekar dan tangkai bunga baby's breath kecil di sampingnya. Tidak ada objek lain yang berceceran.

PENCAHAYAAN & TEKSTUR (CAMERA LOOK):
- Pencahayaan: High-key studio lighting dipadu dengan arah cahaya matahari alami dari jendela samping (side sunlight), membentuk pola bayangan lembut dan pantulan cahaya bening pada permukaan kaca botol.
- Kualitas HD & Ketajaman: Ketajaman mikroskopis pada sudut kaca botol, kilap cairan, serat kelopak bunga, dan tekstur kain sutra.
- Spesifikasi Kamera: Shot on Hasselblad H6D-100c, lensa Macro 120mm f/4, eye-level straight-on angle, f/8 aperture untuk memastikan seluruh area botol hingga bunga di sekitarnya dalam fokus tajam. Tanpa efek CGI, tanpa tekstur plastik buatan AI, murni estetika foto kamera asli (raw photo aesthetic). --ar 3:4 --v 6.1 --style raw`,
    negativePrompt: 'blurry, low quality, dark shadows, plastic look, CGI render, cartoon, extra objects, deformed bottle, modified bow, altered typography, watermark',
    model: 'Hasselblad Macro / Midjourney v6.1',
    seed: '891240162',
    src: '/images/parfum-miss-dior.jpg',
    tags: ['Foto Studio Parfum', 'Miss Dior', 'Parfum Estetik', 'Luxury Product', '3:4', 'Hasselblad'],
  },
  {
    id: 'pg-1',
    title: 'Neon Cyberpunk Samurai in Neo-Tokyo',
    category: 'Character & Sci-Fi',
    type: 'photo',
    orientation: 'portrait',
    aspectRatio: '9:16',
    prompt: 'Hyper-detailed futuristic cyberpunk warrior standing under volumetric neon rain, reflective chrome armor, glowing katana blade emitting cyan sparks, holographic visor with kanji HUD, dark alley in Neo-Tokyo, octane render, 8k resolution, cinematic lighting, photorealistic, 35mm photography --ar 9:16 --v 6.1 --style raw',
    negativePrompt: 'blurry, low quality, oversaturated, deformed hands, bad anatomy, cartoon, watermark',
    model: 'Midjourney v6.1',
    seed: '784291034',
    src: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    tags: ['Cyberpunk', 'Portrait', 'Sci-Fi', 'Neon'],
  },
  {
    id: 'pg-2',
    title: 'Kinetic Liquid Gold Fluid Simulation',
    category: 'Motion & Abstract',
    type: 'video',
    orientation: 'landscape',
    aspectRatio: '16:9',
    prompt: 'Cinematic slow motion fluid dynamics, molten gold and obsidian black viscous liquid colliding in zero gravity, micro bubbles, radiant specular highlights, studio rim lighting, 4k 60fps macro slowmo, photorealistic physics, pristine reflection',
    negativePrompt: 'pixelated, jerky movement, flickering, low frame rate, noisy render',
    model: 'Runway Gen-3 Alpha',
    seed: '942051278',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-liquid-colors-mixing-together-41487-large.mp4',
    duration: '0:06',
    tags: ['Fluid Simulation', 'Liquid Gold', 'Abstract', '3D Motion'],
  },
  {
    id: 'pg-3',
    title: 'Ethereal Solar Goddess of Light',
    category: 'Fashion & Editorial',
    type: 'photo',
    orientation: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Haute couture editorial portrait of an ethereal goddess bathed in golden hour sunlight, woven amber halo crown, flowing silk translucent dress caught in sea breeze, glowing skin, soft focus lens bokeh, Vogue cover style, shot on Hasselblad H6D-100c, sharp detail --ar 3:4 --v 6.1',
    negativePrompt: 'extra limbs, bad eyes, poorly drawn face, plastic skin, mutation',
    model: 'Flux.1 Schnell',
    seed: '319582041',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    tags: ['Editorial', 'Portrait', 'Haute Couture', 'Golden Hour'],
  },
  {
    id: 'pg-4',
    title: 'Hyper-Futuristic Solarpunk Metropolis',
    category: 'Architecture & World Building',
    type: 'photo',
    orientation: 'landscape',
    aspectRatio: '16:9',
    prompt: 'Ultra-wide angle aerial panoramic view of a lush sustainable solarpunk city in year 2150, bioluminescent sky gardens, curved organic glass skyscrapers, flying magnetic transit vehicles weaving between vertical forests, crystal clear waterfalls cascading down skyscrapers, dramatic volumetric god rays --ar 16:9 --style raw',
    negativePrompt: 'foggy, smog, ruined buildings, dystopian, low poly, oversaturated, text',
    model: 'Stable Diffusion XL',
    seed: '512893472',
    src: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    tags: ['Solarpunk', 'Architecture', 'Futuristic', 'Landscape'],
  },
  {
    id: 'pg-5',
    title: 'Holographic Cyber Beast Panther Walk',
    category: 'Creature Animation',
    type: 'video',
    orientation: 'landscape',
    aspectRatio: '16:9',
    prompt: 'Futuristic black panther with glowing cybernetic circuits and holographic crystalline coat stalking smoothly towards camera through dark misty forest, laser grid floor, glowing amber eyes, volumetric particle fog, ultra-realistic fur and biomechanics, cinematic depth of field',
    negativePrompt: 'stiff animation, distorted legs, robotic jitter, cartoonish',
    model: 'Kling AI v1.5',
    seed: '628491023',
    src: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1200&q=80',
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-lines-of-light-passing-in-the-dark-42436-large.mp4',
    duration: '0:05',
    tags: ['Cyber Beast', 'Creature FX', 'Neon Glow', 'Cinematic'],
  },
  {
    id: 'pg-6',
    title: 'Neon Noir Street Wanderer in Rainy City',
    category: 'Cinematography',
    type: 'video',
    orientation: 'portrait',
    aspectRatio: '9:16',
    prompt: 'Vertical cinematic slow motion reel of a mysterious figure holding a clear umbrella walking away from camera down an illuminated neon boulevard in Shibuya, asphalt reflecting pink and yellow neon streetlights, gentle rainfall, anamorphic lens flare, moody film grain, 4k 9:16 format',
    negativePrompt: 'jerky movement, bad reflections, washed out colors, low res',
    model: 'Luma Dream Machine',
    seed: '142857391',
    src: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-car-traveling-at-night-through-a-city-43282-large.mp4',
    duration: '0:08',
    tags: ['Vertical Reel', 'Neon Noir', 'Cinematic Rain', 'Tokyo'],
  },
  {
    id: 'pg-7',
    title: 'Studio Monolithic Mineral Sculpture',
    category: 'Product & Design',
    type: 'photo',
    orientation: 'portrait',
    aspectRatio: '3:4',
    prompt: 'Minimalist industrial design object crafted from raw black granite, polished obsidian glass, and brushed champagne gold geometric accents, floating in negative space, soft shadow casting, museum pedestal lighting, Leica SL2, 90mm f/2.8, Hasselblad natural color solution',
    negativePrompt: 'busy background, dusty, scratched texture, cartoon, cheap 3d look',
    model: 'Flux.1 Dev',
    seed: '883920194',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    tags: ['Product Design', 'Minimalism', 'Studio Lighting', 'Luxury'],
  },
  {
    id: 'pg-8',
    title: 'Cosmic Nebula Warp Speed Exploration',
    category: 'Space & VFX',
    type: 'video',
    orientation: 'landscape',
    aspectRatio: '21:9',
    prompt: 'Ultrawide cinematic camera gliding through a luminous purple and gold interstellar nebula, star birth cluster with sparkling stellar dust, gravitational light distortion, lens flare, James Webb space telescope aesthetic, 60fps smooth glide, ultra photorealistic',
    negativePrompt: 'flat texture, 2d painting, artifacts, pixel noise, jump cuts',
    model: 'Runway Gen-3 Alpha',
    seed: '447109283',
    src: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    videoSrc: 'https://assets.mixkit.co/videos/preview/mixkit-traveling-through-a-starry-galaxy-space-tunnel-42437-large.mp4',
    duration: '0:10',
    tags: ['Space', 'Nebula', 'Ultrawide 21:9', 'Sci-Fi'],
  },
];
