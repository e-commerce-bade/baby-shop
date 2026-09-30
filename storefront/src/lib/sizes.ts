import { foldForSearch } from '@/lib/utils'

// Magaza sahibinin sabitledigi yas araliklari. Beden serbest yazilmaz, bu listeden secilir;
// boylece ayni bedenin farkli yazimlari ("3-4", "3-4 Yas", "3-4Yaş") olusmaz.
export const KIDS_AGE_SIZES = [
  '1-2 Yaş',
  '2-3 Yaş',
  '3-4 Yaş',
  '4-5 Yaş',
  '5-6 Yaş',
  '6-7 Yaş',
  '7-8 Yaş',
  '8-9 Yaş',
  '9-10 Yaş',
  '10-11 Yaş',
  '11-12 Yaş',
  '12-13 Yaş',
  '13-14 Yaş',
]

export const BABY_MONTH_SIZES = ['0-3 Ay', '3-6 Ay', '6-9 Ay', '9-12 Ay', '12-18 Ay', '18-24 Ay', '24-36 Ay']

// Kategoriye gore secilebilir beden listesi: bebek kategorilerinde ay, digerlerinde yas.
export function sizeOptionsForCategory(categoryName?: string | null) {
  const normalized = foldForSearch(categoryName ?? '')
  if (['bebek', 'baby', 'newborn', 'yenidogan'].some((word) => normalized.includes(word))) {
    return { label: 'Bebek ay aralığı', sizes: BABY_MONTH_SIZES }
  }
  return { label: 'Çocuk yaş aralığı', sizes: KIDS_AGE_SIZES }
}

// Siralama anahtari: once ay bedenleri, sonra yaslar, en sonda sayi icermeyen etiketler;
// kendi icinde ilk ve ikinci sayiya gore ("3-4" < "10-11", "5-6" < "6" < "6-7").
function sizeSortKey(label: string): [number, number, number] {
  const numbers = label.match(/\d+/g)?.map(Number) ?? []
  if (numbers.length === 0) return [2, 0, 0]
  const isMonths = /\d\s*(ay|a|m|mo|months?)\s*$/i.test(label.trim())
  return [isMonths ? 0 : 1, numbers[0], numbers[1] ?? numbers[0]]
}

// Iki etiket ayni yas/ay araligini mi yaziyor ("3-4" ile "3-4 Yaş", "6" ile "6 Yaş")?
export function sameSizeRange(a: string, b: string) {
  const keyA = sizeSortKey(a)
  const keyB = sizeSortKey(b)
  return keyA[0] !== 2 && keyA.every((part, index) => part === keyB[index])
}

export function compareSizeLabels(a: string, b: string): number {
  const keyA = sizeSortKey(a)
  const keyB = sizeSortKey(b)
  for (let i = 0; i < keyA.length; i++) {
    if (keyA[i] !== keyB[i]) return keyA[i] - keyB[i]
  }
  return a.localeCompare(b, 'tr')
}
