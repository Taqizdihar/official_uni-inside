import cameraman from '../assets/our-services/Cameraman.avif';
import droneman from '../assets/our-services/Droneman.avif';
import programmer from '../assets/our-services/Programmer.avif';
import { isDesignPreviewRoute } from '../public/designPreview';

export type StudioImage = { secure_url: string; alt_text?: string | null; width_px?: number | null; height_px?: number | null };
export type StudioService = {
  id?: number | string;
  slug?: string;
  name?: string;
  category_name?: string | null;
  short_description?: string | null;
  description?: string | null;
  image?: StudioImage | null;
  images?: StudioImage[] | null;
  items?: { item_type: 'included' | 'deliverable' | 'requirement' | 'not_included'; label: string }[] | null;
  processSteps?: { title: string; description?: string | null }[] | null;
  pricing_type?: 'fixed' | 'starting_from' | 'range' | 'contact' | null;
  starting_price?: string | number | null;
  currency_code?: string | null;
  price_note?: string | null;
  estimated_duration?: string | null;
  primary_cta_label?: string | null;
  primary_cta_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

export const canShowStudioPreview = (pathname: string, search: string) => isDesignPreviewRoute(pathname, search);

export function servicePrice(service: StudioService) {
  const amount = Number(service.starting_price);
  const currency = /^[A-Z]{3}$/.test(service.currency_code ?? '') ? service.currency_code! : 'IDR';
  const hasAmount = service.starting_price !== null && service.starting_price !== undefined && service.starting_price !== '' && Number.isFinite(amount) && amount > 0;
  let formatted: string | null = null;
  if (hasAmount) {
    try { formatted = new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'IDR' ? 0 : 2 }).format(amount); }
    catch { formatted = null; }
  }
  const note = service.price_note?.trim() || null;
  switch (service.pricing_type) {
    case 'fixed': return { label: formatted ? 'Published fixed price' : 'Pricing', value: formatted ?? note, note: formatted ? note : null };
    case 'starting_from': return { label: formatted ? 'Starting from' : 'Pricing', value: formatted ?? note, note: formatted ? note : null };
    case 'range': return { label: 'Price range', value: note, note: null };
    case 'contact': return { label: 'Pricing by enquiry', value: note ?? 'Discuss your brief for a quote.', note: null };
    default: return { label: 'Pricing', value: note, note: null };
  }
}

export function safeServiceHref(raw: unknown) {
  if (typeof raw !== 'string') return null;
  const href = raw.trim();
  if (!href || /[\u0000-\u001f\\]/.test(href)) return null;
  if (/^\/(?!\/)/.test(href)) return href;
  if (/^mailto:[^\s@]+@[^\s@]+(?:\?[^\s]*)?$/i.test(href)) return href;
  if (/^tel:\+?[\d(). -]+$/i.test(href)) return href;
  try {
    const url = new URL(href);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? href : null;
  } catch { return null; }
}

// Illustration and copy here are only for explicit design review, not CMS listings.
export const studioPreviewServices: StudioService[] = [
  {
    id: 'studio-sample-1', slug: 'design-preview', name: 'Visual production',
    short_description: 'A sample brief for exploring how a full Studio service could read from first conversation to final handoff.',
    image: { secure_url: cameraman, alt_text: 'Illustrative camera operator artwork' },
    images: [{ secure_url: droneman, alt_text: 'Illustrative drone operator artwork' }, { secure_url: programmer, alt_text: 'Illustrative creative technology artwork' }],
    description: '<p>This sample service demonstrates a collaboration page with scope, process, and visual references. It is design material, not a published offering or record of completed client work.</p><p>A real Studio page would draw these details from the published CMS entry.</p>',
    items: [
      { item_type: 'included', label: 'Example: planning conversation and creative direction' },
      { item_type: 'included', label: 'Example: production planning' },
      { item_type: 'deliverable', label: 'Example: agreed final media files' },
      { item_type: 'requirement', label: 'Example: a brief, references, and intended use' },
      { item_type: 'not_included', label: 'Example: services outside the agreed scope' },
    ],
    processSteps: [
      { title: 'Understand the brief', description: 'Example step: clarify the idea, audience, and goals.' },
      { title: 'Shape the approach', description: 'Example step: agree on a suitable production direction.' },
      { title: 'Create and hand over', description: 'Example step: review and deliver the agreed output.' },
    ],
    pricing_type: 'starting_from', starting_price: 1500000, currency_code: 'IDR',
    price_note: 'Illustrative pricing only; no service is offered at this sample price.',
    estimated_duration: 'Illustrative schedule only',
  },
  {
    id: 'studio-sample-2', slug: 'design-preview', name: 'Digital experiments',
    short_description: 'A spare sample showing how a service page works when only the essentials are published.',
    image: { secure_url: programmer, alt_text: 'Illustrative programmer artwork' },
    description: '<p>This lean sample shows a short description and one image. It makes no claim about a live Studio offering.</p>',
  },
  {
    id: 'studio-sample-3', slug: 'design-preview', name: 'Aerial perspectives',
    short_description: 'An illustrative study of a focused creative capability, with a concise scope and a contact-based pricing note.',
    image: { secure_url: droneman, alt_text: 'Illustrative drone operator artwork' },
    items: [
      { item_type: 'deliverable', label: 'Example: agreed aerial footage files' },
      { item_type: 'requirement', label: 'Example: location and intended use' },
    ],
    pricing_type: 'contact', price_note: 'Sample only — scope would be discussed first.',
  },
];
