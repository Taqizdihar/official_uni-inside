import { GoogleGenAI } from '@google/genai';

// Model image-generation Gemini (image-to-image). "nano-banana" terbaru.
const IMAGE_MODEL = 'gemini-2.5-flash-image';

function getApiKey(): string {
  const fromEnv = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
    ?? (import.meta.env.GEMINI_API_KEY as string | undefined);
  return (fromEnv ?? '').trim();
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export async function transformImage(
  imageDataUrl: string,
  templatePrompt: string,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'API key Gemini belum diatur. Tambahkan GEMINI_API_KEY di file .env lalu restart dev server.',
    );
  }

  // Pisahkan header data-url dari payload base64 murni.
  const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) {
    throw new Error('Format gambar tidak dikenali. Gunakan PNG atau JPEG.');
  }
  const mimeType = match[1] === 'jpg' ? 'image/jpeg' : match[1];
  const base64Data = match[2];

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      role: 'user',
      parts: [
        { text: templatePrompt },
        { inlineData: { mimeType, data: base64Data } },
      ],
    },
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  // Ambil bagian gambar dari kandidat pertama.
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      const mime = part.inlineData.mimeType ?? 'image/png';
      return `data:${mime};base64,${part.inlineData.data}`;
    }
  }

  // Fallback: cek field lain yang mungkin menyimpan gambar.
  const text = parts.map((p) => (p.text ?? '')).join(' ').trim();
  throw new Error(
    text
      ? `Gemini tidak mengembalikan gambar. Respon teks: ${text.slice(0, 200)}`
      : 'Gemini tidak mengembalikan gambar. Coba ulangi.',
  );
}
