-- PREPARED, INACTIVE: activate only after migration 003 is verified.
-- One optional media record per variant; existing variants remain unchanged.
ALTER TABLE product_variants
    ADD COLUMN media_id BIGINT UNSIGNED NULL AFTER product_id,
    ADD KEY idx_product_variants_media (media_id),
    ADD CONSTRAINT fk_product_variants_media
        FOREIGN KEY (media_id) REFERENCES media_assets (id)
        ON UPDATE CASCADE ON DELETE SET NULL;

-- Later backend work must protect semantic media soft-deletion while a variant
-- references media_id; this foreign key governs physical deletion only.
