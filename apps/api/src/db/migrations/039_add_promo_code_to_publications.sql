-- Founder request 2026-09-27: optional promo code on Home's promotion
-- carousel cards, display-only (no discount-application/checkout logic).
-- Nullable, and only ever meaningful for type='promotion' - the CHECK
-- keeps a code from ever being set on a type='notification' row, mirroring
-- how image_url/cta_label/cta_link are already promotion-only in practice
-- (just not enforced at this layer per the original 035 migration's note).
ALTER TABLE publications ADD COLUMN promo_code VARCHAR(40);
ALTER TABLE publications ADD CONSTRAINT publications_promo_code_promotion_only
  CHECK (promo_code IS NULL OR type = 'promotion');
