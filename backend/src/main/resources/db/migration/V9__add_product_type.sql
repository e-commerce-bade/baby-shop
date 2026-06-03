ALTER TABLE products
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(120);

UPDATE products
SET product_type = CASE
    WHEN LOWER(name) LIKE '%pijama%' THEN 'Pijama'
    WHEN LOWER(name) LIKE '%elbise%' OR LOWER(name) LIKE '%dress%' THEN 'Elbise'
    WHEN LOWER(name) LIKE '%gömlek%' OR LOWER(name) LIKE '%gomlek%' THEN 'Gomlek'
    WHEN LOWER(name) LIKE '%tulum%' OR LOWER(name) LIKE '%romper%' THEN 'Tulum'
    WHEN LOWER(name) LIKE '%hırka%' OR LOWER(name) LIKE '%hirka%' OR LOWER(name) LIKE '%cardigan%' THEN 'Hirka'
    WHEN LOWER(name) LIKE '%pantolon%' THEN 'Pantolon'
    WHEN LOWER(name) LIKE '%zibin%' OR LOWER(name) LIKE '%body%' THEN 'Body'
    WHEN LOWER(name) LIKE '%sweatshirt%' THEN 'Sweatshirt'
    WHEN LOWER(name) LIKE '%salopet%' THEN 'Salopet'
    WHEN LOWER(name) LIKE '%bere%' OR LOWER(name) LIKE '%eldiven%' THEN 'Aksesuar'
    ELSE 'Diger'
END
WHERE product_type IS NULL OR TRIM(product_type) = '';
