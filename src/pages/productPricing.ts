type Amount = number | string | null;

export function variantFinalPrice(
  product: { base_price?: Amount },
  variant: { final_price?: Amount; price_adjustment?: Amount },
): number | null {
  if (variant.final_price !== undefined) {
    const value = Number(variant.final_price);
    return variant.final_price == null || variant.final_price === '' || !Number.isFinite(value) || value < 0 ? null : value;
  }
  if (product.base_price == null || product.base_price === '' || variant.price_adjustment == null || variant.price_adjustment === '') return null;
  const base = Number(product.base_price), adjustment = Number(variant.price_adjustment);
  if (!Number.isFinite(base) || !Number.isFinite(adjustment)) return null;
  const value = Math.round((base + adjustment) * 100) / 100;
  return Number.isFinite(value) && value >= 0 ? value : null;
}
