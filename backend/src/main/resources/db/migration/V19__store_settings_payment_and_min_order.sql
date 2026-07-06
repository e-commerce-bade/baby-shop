-- Magaza ayarlarina odeme secenekleri, minimum sepet tutari ve kargo firmalari eklenir.
-- Hepsi admin panelden duzenlenebilir (store_settings tek satirlik kayit, id = 1).
ALTER TABLE store_settings
    ADD COLUMN IF NOT EXISTS minimum_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 400,
    ADD COLUMN IF NOT EXISTS card_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cod_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cod_surcharge NUMERIC(12, 2) NOT NULL DEFAULT 25,
    ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS bank_transfer_iban VARCHAR(40),
    ADD COLUMN IF NOT EXISTS bank_transfer_account_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS bank_transfer_bank_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS shipping_carriers VARCHAR(500) NOT NULL DEFAULT 'PTT Kargo,Yurtiçi Kargo';

-- Musterinin verdigi banka bilgilerini varsayilan olarak yerlestir (yalnizca bos ise).
UPDATE store_settings
   SET bank_transfer_iban = 'TR84 0004 6000 0288 8000 6257 30',
       bank_transfer_account_name = 'Erman Yorulmaz',
       bank_transfer_bank_name = 'Akbank'
 WHERE id = 1
   AND (bank_transfer_iban IS NULL OR bank_transfer_iban = '');
