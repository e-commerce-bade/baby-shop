-- Uygulama email'leri zaten kucuk harfe normalize ederek yaziyor (kayit/Google/bootstrap).
-- Eski kayitlar icin guvence: mevcut email'leri kucuk harfe cevir.
UPDATE users SET email = lower(email) WHERE email <> lower(email);

-- Buyuk/kucuk harf duyarsiz benzersizlik. findByEmailIgnoreCase ile tutarli; ayni adresin
-- farkli case ile iki kez kaydedilip aramalari belirsizlestirmesini DB seviyesinde engeller.
DROP INDEX IF EXISTS uq_users_email_lower;
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));
