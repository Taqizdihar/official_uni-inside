-- PREPARED, INACTIVE: activate only after migration 002 is verified.
-- Nullable reference keeps legacy and marketplace purchase links valid.
ALTER TABLE product_purchase_links
    ADD COLUMN social_link_id BIGINT UNSIGNED NULL AFTER product_id,
    ADD KEY idx_product_purchase_links_social_link (social_link_id),
    ADD CONSTRAINT fk_product_purchase_links_social_link
        FOREIGN KEY (social_link_id) REFERENCES social_links (id)
        ON UPDATE CASCADE ON DELETE RESTRICT;

-- No automatic URL-based assignment: a DBA must review ambiguous legacy
-- WhatsApp links before the later application phase adds account selection.
