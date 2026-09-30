import { GoogleGenAI } from '@google/genai';

export interface GeneratedPromptResult {
  title: string;
  category: string;
  aspectRatio: '9:16' | '16:9' | '3:4' | '1:1';
  prompt: string;
  negativePrompt: string;
  camera: string;
  lighting: string;
  tags: string[];
  imageUrl?: string;
  isVisionMode?: boolean;
}

export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('uni_gemini_api_key');
    if (saved && saved.trim()) return saved.trim();
  }
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
    ?? (import.meta.env.GEMINI_API_KEY as string | undefined);
  return (fromEnv ?? '').trim();
}

export function saveGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem('uni_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('uni_gemini_api_key');
    }
  }
}

export interface PromptGenerationParams {
  idea?: string;
  ratio: '9:16' | '16:9' | '3:4' | '1:1';
  style: string;
  targetAi: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageUrl?: string;
  imageFileName?: string;
}

export async function generatePromptWithGemini(params: PromptGenerationParams): Promise<GeneratedPromptResult> {
  const apiKey = getGeminiApiKey();
  const isVision = Boolean(params.imageBase64 || params.imageUrl);

  // Jika ada API Key Gemini, gunakan model Gemini AI (Multimodal Vision / Text)
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are a world-class Visual Director and AI Prompt Engineer specializing in commercial studio photography, product visualization, and cinematic rendering for Midjourney v6.1 and Flux.
${isVision ? 'The user has provided a product/subject image. Analyze the image in extreme detail: identify the subject (e.g. exotic fruit, luxury perfume, cosmetic bottle, jewelry, apparel), materials, surfaces, micro-textures (water droplets, pores, glass reflections, specular highlights), color palette, studio lighting setup, and camera angle. Synthesize this into a studio-grade prompt formula.' : 'Your task is to transform the user visual idea into a studio-grade prompt formula.'}
Your output MUST be pure JSON without markdown fences (no \`\`\`json):
{
  "title": "Short aesthetic title (e.g. Commercial Studio Dragonfruit / Luxury Amber Perfume)",
  "category": "${params.style}",
  "aspectRatio": "${params.ratio}",
  "prompt": "Complete, comprehensive, studio-grade prompt formula specifying subject, microscopic texture details, studio lighting, camera specs. End with --ar ${params.ratio} --v 6.1 --style raw",
  "negativePrompt": "Attributes to avoid (e.g. blurry, low quality, cartoon, plastic, distorted, watermark)",
  "camera": "Camera & lens specification (e.g. Hasselblad H6D-100c, 120mm f/4 Macro)",
  "lighting": "Detailed studio lighting description",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"]
}`;

      const userPromptText = isVision
        ? `Analyze this attached image and extract its complete visual DNA. ${params.idea ? `User creative direction: ${params.idea}.` : ''} Target visual style: ${params.style}. Aspect ratio: ${params.ratio}. Platform: ${params.targetAi}.`
        : `Visual idea: ${params.idea || 'Studio commercial hero'}. Target style: ${params.style}. Aspect ratio: ${params.ratio}. Platform: ${params.targetAi}.`;

      let contents: any;
      if (params.imageBase64 && params.imageMimeType) {
        // Multimodal Gemini Vision call
        contents = [
          {
            inlineData: {
              data: params.imageBase64,
              mimeType: params.imageMimeType,
            },
          },
          {
            text: `${systemInstruction}\n\n${userPromptText}`,
          },
        ];
      } else {
        contents = `${systemInstruction}\n\n${userPromptText}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
      });

      const rawText = response.text?.trim() || '';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        title: parsed.title || (isVision ? 'Studio Commercial Reverse Prompt' : `Studio ${params.idea?.slice(0, 25) || 'Visual'}`),
        category: parsed.category || params.style,
        aspectRatio: params.ratio,
        prompt: parsed.prompt,
        negativePrompt: parsed.negativePrompt || 'blurry, low quality, cartoon, plastic, distorted, oversaturated, watermark, cgi render',
        camera: parsed.camera || 'Hasselblad H6D-100c, 120mm f/4 Macro',
        lighting: parsed.lighting || 'Studio High-Key Lighting with diffused softboxes & subtle rim light',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['Vision AI', params.style, params.ratio],
        imageUrl: params.imageUrl,
        isVisionMode: isVision,
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to offline smart synthesis:', err);
    }
  }

  // Smart Offline Synthesis Engine (Mendukung Vision Reverse-Prompting & Text)
  return generateOfflinePrompt(params);
}

function generateOfflinePrompt(params: PromptGenerationParams): GeneratedPromptResult {
  const isVision = Boolean(params.imageBase64 || params.imageUrl || params.imageFileName);
  let cleanIdea = params.idea?.trim() || '';

  if (!cleanIdea && isVision) {
    const fn = (params.imageFileName || '').toLowerCase();
    if (fn.includes('parfum') || fn.includes('perfume') || fn.includes('fragrance')) {
      cleanIdea = 'Luxury glass perfume bottle with golden ambient mist and crystal reflections';
    } else if (fn.includes('naga') || fn.includes('dragonfruit') || fn.includes('buah') || fn.includes('fruit')) {
      cleanIdea = 'Fresh exotic sliced dragonfruit with glistening water droplets and vibrant pink scales';
    } else if (fn.includes('kopi') || fn.includes('coffee')) {
      cleanIdea = 'Artisanal iced coffee with swirling cream in ribbed glassware';
    } else if (fn.includes('skincare') || fn.includes('serum') || fn.includes('cream')) {
      cleanIdea = 'Minimalist luxury skincare serum bottle with amber dropper on wet travertine stone';
    } else {
      cleanIdea = 'Studio commercial product hero with realistic surface textures and crisp reflections';
    }
  } else if (!cleanIdea) {
    cleanIdea = 'Objek studio estetik';
  }
  const title = `Foto Studio Estetik ${cleanIdea.length > 28 ? cleanIdea.slice(0, 25) + '...' : cleanIdea}`;

  let camera = 'Hasselblad H6D-100c, 120mm f/4 Macro lens';
  let lighting = 'High-key studio softbox with subtle rim lights and warm ambient fill';
  let composition = 'Centered hero composition with balanced negative space';

  if (params.style.includes('Food') || params.style.includes('Beverage') || params.style.includes('Kuliner')) {
    camera = 'Hasselblad H6D-100c, 120mm f/4 Macro lens';
    lighting = 'Bright high-key studio diffused softbox, glistening moisture dewdrops, zero harsh shadows';
    composition = '45-degree angle close-up macro, beautifully arranged food plating with authentic texture';
  } else if (params.style.includes('Luxury') || params.style.includes('Skincare') || params.style.includes('Product')) {
    camera = 'Phase One XF IQ4 150MP, 110mm Schneider Kreuznach lens';
    lighting = 'Dramatic luxury studio rim lighting, soft reflections on clean marble or acrylic pedestal';
    composition = 'Centered hero commercial product shot, flawless clean negative space';
  } else if (params.style.includes('Cinematic') || params.style.includes('Movie')) {
    camera = 'ARRI Alexa LF, 35mm Cooke Anamorphic lens, f/2.0';
    lighting = 'Atmospheric moody chiaroscuro lighting, subtle neon rim glow and volumetric haze';
    composition = 'Dynamic cinematic angle with shallow depth of field and authentic 35mm film grain';
  } else if (params.style.includes('Fashion') || params.style.includes('Couture') || params.style.includes('Editorial')) {
    camera = 'Leica SL2, 90mm Summicron f/2.0 lens';
    lighting = 'Diffused golden hour sunlight through sheer linen curtains with soft skin highlights';
    composition = 'Haute-couture editorial rule-of-thirds composition, Vogue cover aesthetics';
  } else if (params.style.includes('Minimalist') || params.style.includes('Zen')) {
    camera = 'Fujifilm GFX 100 II, 110mm f/2 lens';
    lighting = 'Pure high-key natural north-facing window light, zero harsh shadows';
    composition = 'Zen-inspired minimalist placement, architectural geometric harmony and negative space';
  } else if (params.style.includes('Cyberpunk') || params.style.includes('Neon')) {
    camera = 'Sony A7R V, 35mm f/1.4 GM lens';
    lighting = 'Vibrant volumetric cyan and magenta neon street reflections on wet rainy asphalt';
    composition = 'Low-angle futuristic cyberpunk street glide, holographic UI glow';
  } else if (params.style.includes('Landscape') || params.style.includes('Geographic')) {
    camera = 'Nikon Z9, 24-70mm f/2.8 S lens';
    lighting = 'Dramatic golden hour alpine sunlight breaking through moody storm clouds';
    composition = 'Panoramic wide-angle landscape, National Geographic editorial grade';
  } else if (params.style.includes('Automotive') || params.style.includes('Car')) {
    camera = 'Hasselblad H6D-100c, 50mm f/3.5 lens';
    lighting = 'Precision studio light tube reflections sweeping along metallic car curvature';
    composition = 'Dynamic three-quarter front hero angle, glossy reflections, motion blur background';
  } else if (params.style.includes('3D') || params.style.includes('Fluid')) {
    camera = 'Octane / Redshift Cinema 4D 8k render';
    lighting = 'Studio caustics, radiant chromatic aberration, translucent subsurface scattering';
    composition = 'Microscopic zero-gravity fluid dynamics collision with glittering particle dust';
  } else if (params.style.includes('Anime') || params.style.includes('Concept Art')) {
    camera = 'Cinematic digital matte painting, Makoto Shinkai style';
    lighting = 'Luminous ethereal sunset god rays, sparkling dust motes, vivid gradient skies';
    composition = 'Vast emotional wide shot with breathtaking cloud formations and vibrant color palette';
  } else if (params.style.includes('Reels') || params.style.includes('TikTok')) {
    camera = 'RED V-Raptor 8k, 24mm f/1.4 lens';
    lighting = 'High-energy studio RGB key light, sharp rim highlights, fast dynamic exposure';
    composition = 'Vertical 9:16 high-impact action framing with smooth mobile gimbal movement';
  }

  const prompt = `Foto studio komersial Ultra HD super tajam (8k resolution, extreme crisp micro-detail) menampilkan ${cleanIdea}.

TATA LETAK & KOMPOSISI:
- Komposisi: ${composition}, subjek utama berada di pusat fokus dengan detail tekstur serat yang sangat nyata.
- Penataan elemen: Ditata rapi dengan proporsi elegan, permukaan bertekstur premium tanpa distorsi.
- Detail Permukaan: Kilap embun air realistis, tekstur mikroskopis yang halus dan autentik.

PENCAHAYAAN & WARNA:
- Pencahayaan: ${lighting}.
- Gradasi Warna: Palet warna harmonis, saturasi natural, kontras lembut berstandar editorial komersial.

SPESIFIKASI TEKNIS:
- Kamera & Lensa: Shot on ${camera}.
- Sudut Pengambilan: Sudut 45 derajat close-up makro, fokus tajam ke subjek utama dengan bokeh lembut di latar belakang.
- Kualitas: Ultra-realistic, pore-level texture, raw photorealism, tanpa efek CGI atau plastik AI. --ar ${params.ratio} --v 6.1 --style raw`;

  const negativePrompt = 'blurry, low quality, oversaturated, cartoon, CGI render, 3D model, bad anatomy, deformed shapes, plastic look, fake skin, noisy background, watermark, text logo';

  return {
    title,
    category: params.style,
    aspectRatio: params.ratio,
    prompt,
    negativePrompt,
    camera,
    lighting,
    tags: [isVision ? 'Vision AI' : 'Gemini AI', cleanIdea.slice(0, 15), params.style, params.ratio, 'Studio 8k'],
    imageUrl: params.imageUrl,
    isVisionMode: isVision,
  };
}
