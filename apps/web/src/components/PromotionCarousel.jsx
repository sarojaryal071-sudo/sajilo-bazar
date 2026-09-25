import { motion } from 'framer-motion';

// Home/Dashboard's type='promotion' publications (2026-09-25 - replaces
// PromoBanner, which read the old content_items 'announcement' kind and
// conflated marketing content with personal notifications). Never touches
// notifications/Alerts - purely a merchandising surface driven by
// GET /publications/active. 0 live promotions renders nothing; exactly 1
// is a single full-width card (no arrows/dots); 2+ is a horizontally
// scrollable row, cards floating side by side rather than stacked.
function PromotionCard({ promotion, full }) {
  const content = (
    <>
      {promotion.imageUrl && (
        <img src={promotion.imageUrl} alt="" className="h-28 w-full rounded-xl object-cover" />
      )}
      <p className="mt-2 font-semibold">{promotion.title}</p>
      {promotion.body && <p className="mt-0.5 text-sm text-text-onBrand/90">{promotion.body}</p>}
      {promotion.ctaLabel && <p className="mt-2 text-sm font-semibold underline">{promotion.ctaLabel}</p>}
    </>
  );
  const className = `${
    full ? 'w-full' : 'w-[85%] shrink-0 snap-start'
  } rounded-2xl bg-brand px-4 py-3.5 text-text-onBrand shadow-resting`;

  return promotion.ctaLink ? (
    <a href={promotion.ctaLink} target="_blank" rel="noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function PromotionCarousel({ promotions }) {
  if (!promotions || promotions.length === 0) return null;

  if (promotions.length === 1) {
    return (
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
        <PromotionCard promotion={promotions[0]} full />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
    >
      {promotions.map((promotion) => (
        <PromotionCard key={promotion.id} promotion={promotion} />
      ))}
    </motion.div>
  );
}
