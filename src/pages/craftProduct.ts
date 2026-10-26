import { isDesignPreviewRoute, useDesignPreviewNoIndex } from '../public/designPreview';
import charmHeart from '../assets/our-products/3D Printer Products/Products - 1.png';
import charmLoops from '../assets/our-products/3D Printer Products/Products - 2.png';
import charmMusic from '../assets/our-products/3D Printer Products/Products - 3.png';
import charmCube from '../assets/our-products/3D Printer Products/Products - 7.png';
import charmColour from '../assets/our-products/3D Printer Products/Products - 10.png';
export { variantFinalPrice } from './productPricing';

export type CraftImage = {
  secure_url: string;
  alt_text?: string | null;
  width_px?: number | null;
  height_px?: number | null;
};

export type CraftProduct = {
  id?: number | string;
  slug?: string;
  name?: string;
  product_type?: string | null;
  category_name?: string | null;
  short_description?: string | null;
  description?: string | null;
  image?: CraftImage | null;
  images?: CraftImage[] | null;
  base_price?: number | string | null;
  currency_code?: string | null;
  price_note?: string | null;
  availability_label?: string | null;
  lead_time_text?: string | null;
  minimum_order_quantity?: number | null;
  features?: { label: string; value_text: string }[] | null;
  variants?: { name: string; final_price?: number | string | null; price_adjustment?: number | string | null; stock_quantity?: number | null; image_url?: string | null; image_alt?: string | null }[] | null;
  purchaseLinks?: { id: number; store_name: string; button_label?: string | null; url: string; is_primary?: boolean | number }[] | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

export const productTypeLabel = (type?: string | null) => {
  if (type === 'ready_made') return 'Ready-made';
  if (type === 'custom') return 'Custom';
  if (type === 'both') return 'Ready-made + custom';
  return null;
};

export const formatProductPrice = (amount: number | string | null | undefined, currencyCode?: string | null) => {
  if (amount === null || amount === undefined || amount === '') return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  const currency = /^[A-Z]{3}$/.test(currencyCode ?? '') ? currencyCode! : 'IDR';
  try {
    return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  }
};

export const safePurchaseHref = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (/^\/(?!\/)/.test(href) && !/[\u0000-\u001f\\]/.test(href)) return href;
  try {
    const url = new URL(href);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? href : null;
  } catch { return null; }
};

export const canShowCraftPreview = (search: string) =>
  isDesignPreviewRoute(window.location.pathname, search);

export { useDesignPreviewNoIndex as useCraftPreviewNoIndex };

// Isolated review content. These are existing artwork files, not published products.
export const craftPreviewItems: CraftProduct[] = [
  {
    id: 'sample-01', slug: 'design-preview', name: 'Charm Studies / Concept Series', product_type: 'custom',
    short_description: 'An illustrative set of small object studies for the Craft gallery layout.',
    image: { secure_url: charmHeart, alt_text: 'Illustrative heart charm artwork' },
    base_price: 125000, currency_code: 'IDR', price_note: 'Illustrative price for layout review only.',
  },
  {
    id: 'sample-02', slug: 'design-preview', name: 'Signal Loop Study', product_type: 'ready_made',
    short_description: 'A sample object image used to review scale, spacing, and card rhythm.',
    image: { secure_url: charmCube, alt_text: 'Illustrative blue and white loop charm artwork' },
    price_note: 'Sample content — no item is listed for sale.',
  },
  {
    id: 'sample-03', slug: 'design-preview', name: 'Colour Clip Study', product_type: 'both',
    short_description: 'A playful sample image showing how a varied collection could be presented.',
    image: { secure_url: charmColour, alt_text: 'Illustrative colourful charm artwork' },
  },
];

export const craftPreviewDetail: CraftProduct = {
  ...craftPreviewItems[0],
  description: '<p>This sample page demonstrates how a small, personal object could be presented. The artwork and specifications are illustrative; they do not describe a published product.</p><p>Real product details will come directly from the Uni-Inside CMS when a product is published.</p>',
  images: [
    { secure_url: charmLoops, alt_text: 'Illustrative loop and dice charm artwork' },
    { secure_url: charmMusic, alt_text: 'Illustrative music charm artwork' },
  ],
  availability_label: 'Sample availability label',
  lead_time_text: 'Sample lead time information',
  minimum_order_quantity: 1,
  features: [
    { label: 'Format', value_text: 'Illustrative small-object study' },
    { label: 'Personalisation', value_text: 'Example option for layout review' },
  ],
  variants: [
    { name: 'Single concept', final_price: 125000, stock_quantity: null },
    { name: 'Two-piece concept', final_price: 150000, stock_quantity: 3, image_url: charmMusic, image_alt: 'Illustrative music charm artwork' },
  ],
  purchaseLinks: [],
};
