-- Siparis iptal nedeni (admin "Iptal Edildi" durumuna alirken girer).
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);
