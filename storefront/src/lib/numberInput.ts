// Yonetim panelindeki fiyat ve stok kutulari icin kati ayristirma. Number() "1e3", "0x10" ya da
// binlik ayiricili "1.250" gibi yazimlari sessizce baska sayilara cevirir (1000, 16, 1.25); burada
// bunlar gecersiz sayilir ve kullaniciya duzelttirilir. Gecersiz degerde NaN doner.

// En fazla 10 basamak ve 2 ondalik (veritabani kolonu NUMERIC(12,2)); ondalik ayirici nokta ya da virgul.
const PRICE_PATTERN = /^\d{1,10}(?:[.,]\d{1,2})?$/
// Tam sayi, en fazla 9 basamak (backend Integer).
const STOCK_PATTERN = /^\d{1,9}$/

export function parsePriceInput(value: string): number {
  const trimmed = value.trim()
  return PRICE_PATTERN.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN
}

export function parseStockInput(value: string): number {
  const trimmed = value.trim()
  return STOCK_PATTERN.test(trimmed) ? Number(trimmed) : Number.NaN
}

export const PRICE_INPUT_HINT = 'Fiyat 0 veya daha büyük olmalı, en fazla 2 ondalık (örn. 399 ya da 399,90).'
export const STOCK_INPUT_HINT = 'Stok 0 veya daha büyük bir tam sayı olmalı.'
