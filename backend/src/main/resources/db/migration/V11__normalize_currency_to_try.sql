-- Normalize all monetary currencies to TRY (Turkish Lira).
--
-- The demo catalog seed (V6__seed_mock_catalog_products) inserted some product
-- variants priced in USD, which made the storefront show a mix of $ and ₺. The
-- shop targets a Turkish audience, so every price should be displayed in ₺.
--
-- V6 cannot be edited (Flyway validate-on-migrate would fail on the changed
-- checksum), so this forward migration normalizes existing rows. It also covers
-- any fresh database, since it always runs after V6.
--
-- Note: only the currency label is changed, not the numeric amounts — the demo
-- prices are placeholders, so no FX conversion is applied.

UPDATE product_variants SET currency = 'TRY' WHERE currency <> 'TRY';
UPDATE orders         SET currency = 'TRY' WHERE currency <> 'TRY';
UPDATE order_items    SET currency = 'TRY' WHERE currency <> 'TRY';
UPDATE payments       SET currency = 'TRY' WHERE currency <> 'TRY';
