export type ServicePricing = {
  pricing_type: 'contact' | 'fixed' | 'starting_from' | 'range';
  starting_price: number | null;
  currency_code: string;
  price_note: string;
};

export function servicePreviewPrice(pricing: ServicePricing) {
  const note = pricing.price_note.trim();
  let amount = '';
  if (pricing.starting_price !== null && Number.isFinite(pricing.starting_price) && pricing.starting_price > 0) {
    try { amount = new Intl.NumberFormat(pricing.currency_code === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency', currency: pricing.currency_code, maximumFractionDigits: pricing.currency_code === 'IDR' ? 0 : 2,
    }).format(pricing.starting_price); } catch { /* Keep a note or empty state for unsupported currencies. */ }
  }
  switch (pricing.pricing_type) {
    case 'fixed': return { label: 'Harga tetap', value: amount, note };
    case 'starting_from': return { label: 'Mulai dari', value: amount, note };
    case 'range': return { label: 'Rentang harga', value: note, note: '' };
    default: return { label: 'Hubungi kami', value: note || 'Harga dibahas sesuai kebutuhan.', note: '' };
  }
}
