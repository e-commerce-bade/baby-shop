ALTER TABLE payments
    ADD COLUMN success_url VARCHAR(500),
    ADD COLUMN cancel_url VARCHAR(500);
