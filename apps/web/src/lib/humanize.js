// services.category is free-text (e.g. "appliance_repair"), never a
// display string - every render site used to rely on Tailwind's
// `capitalize` class alone, which treats an underscored string as one
// word ("Appliance_repair") since CSS capitalize only capitalizes after
// whitespace. This replaces underscores with spaces first, so the same
// category renders as "Appliance Repair" everywhere it appears.
export function humanizeCategory(category) {
  if (!category) return '';
  return category
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
