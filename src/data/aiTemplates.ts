// Template prompt untuk transformasi foto (image-to-image via Gemini).
// Kategori: Foto (restyle statis) & Video (keyframe sinematik buat acuan video).

export interface TransformTemplate {
  id: string;
  name: string;
  kind: 'foto' | 'video';
  description: string;
  // Prompt yang digabung dengan foto yang diupload.
  prompt: string;
}

export const transformTemplates: TransformTemplate[] = [
  // ── GAYA FOTO ──────────────────────────────────────────────
  {
    id: 'foto-studio',
    name: 'Potret Studio',
    kind: 'foto',
    description: 'Pencahayaan lembut ala studio, tajam dan bersih.',
    prompt:
      'Ubah foto ini menjadi potret studio profesional. Pencahayaan sinematik lembut, lensa 85mm f/1.8, bayangan halus, latar bersih, warna kulit natural, detail tajam, 8K, fotorealistis.',
  },
  {
    id: 'foto-produk',
    name: 'Foto Produk',
    kind: 'foto',
    description: 'Tampilan produk premium di atas pedestal, cocok buat jualan.',
    prompt:
      'Ubah menjadi foto produk premium. Objek utama di atas pedestal batu, latar gradasi gelap, pencahayaan studio dramatis, refleksi halus, detail material jelas, tampak mewah dan mahal, 8K.',
  },
  {
    id: 'foto-cyberpunk',
    name: 'Cyberpunk Neon',
    kind: 'foto',
    description: 'Nuansa neon malam kota futuristik.',
    prompt:
      'Ubah menjadi gaya cyberpunk neon. Hujan volumetrik, cahaya neon cyan dan magenta, suasana kota Tokyo malam, refleksi di jalan basah, mood sinematik, detail tajam, 8K, fotorealistis.',
  },
  {
    id: 'foto-film',
    name: 'Nuansa Film Analog',
    kind: 'foto',
    description: 'Tone hangat ala kamera film, grain halus.',
    prompt:
      'Ubah menjadi foto bergaya film analog. Tone hangat, kontras lembut, grain halus, warna sedikit pudar, pencahayaan golden hour, komposisi sinematik, seperti diambil kamera 35mm.',
  },
  {
    id: 'foto-anime',
    name: 'Ilustrasi Anime',
    kind: 'foto',
    description: 'Gaya anime bersih dengan garis tegas.',
    prompt:
      'Ubah menjadi ilustrasi anime berkualitas tinggi. Garis bersih, pewarnaan cel-shading, detail mata ekspresif, komposisi dinamis, latar artistik, gaya seperti anime studio Jepang modern.',
  },
  {
    id: 'foto-watercolor',
    name: 'Lukisan Cat Air',
    kind: 'foto',
    description: 'Sentuhan artistik cat air yang lembut.',
    prompt:
      'Ubah menjadi lukisan cat air. Goresan lembut, warna menyatu halus, tekstur kertas, pinggiran sedikit blur, gaya seni lukis klasik, tetap kenali subjek utama dengan jelas.',
  },

  // ── GAYA VIDEO (keyframe sinematik) ─────────────────────────
  {
    id: 'video-cinematic',
    name: 'Sinematik Film',
    kind: 'video',
    description: 'Keyframe sinematik 16:9, kedalaman dan mood film.',
    prompt:
      'Buat keyframe sinematik 16:9 dari foto ini. Komposisi film, depth of field dangkal, lensa anamorphic dengan flare halus, color grading teal-orange, mood dramatis, kualitas film bioskop.',
  },
  {
    id: 'video-product-spin',
    name: 'Showreel Produk',
    kind: 'video',
    description: 'Acuan video produk berputar dengan spotlight.',
    prompt:
      'Buat keyframe video produk 16:9. Produk di tengah dengan spotlight dramatis, latar studio gelap dengan partikel cahaya, tampak siap untuk rotasi 360 derajat, tajam dan kontras tinggi.',
  },
  {
    id: 'video-reels',
    name: 'Reels Vertikal',
    kind: 'video',
    description: 'Acuan reels 9:16 dengan warna tegas.',
    prompt:
      'Buat keyframe reels vertikal 9:16 dari foto ini. Warna tegas dan cerah, pencahayaan energik, komposisi dinamis, estetika konten sosial media, tajam, cocok untuk thumbnail reels.',
  },
];
