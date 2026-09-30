const COLOR_HEX: Record<string, string> = {
  acikmavi: '#93C5FD',
  acikpembe: '#F9A8C0',
  adacayi: '#C2D2AE',
  antrasit: '#3F4347',
  beige: '#D6C3A9',
  bej: '#D6C3A9',
  beyaz: '#FFFFFF',
  black: '#111827',
  blue: '#2563EB',
  bordo: '#7B1E2B',
  brown: '#8B5E34',
  camel: '#C19A6B',
  cream: '#F4EEE6',
  ecru: '#EFE6D9',
  ekru: '#EFE6D9',
  fume: '#5F6266',
  fusya: '#D6247F',
  gray: '#9CA3AF',
  green: '#16A34A',
  gri: '#9CA3AF',
  gok: '#BFD3E0',
  gokmavisi: '#BFD3E0',
  gulkurusu: '#C98C8C',
  haki: '#7A7B4F',
  hardal: '#D4A017',
  kahve: '#8B5E34',
  kahverengi: '#8B5E34',
  kiremit: '#B5533C',
  krem: '#F4EEE6',
  kirmizi: '#DC2626',
  lacivert: '#1E3A8A',
  lila: '#C4A3D9',
  mavi: '#2563EB',
  mor: '#9333EA',
  murdum: '#6B2D5C',
  naturel: '#D6C3A9',
  navy: '#1E3A8A',
  orange: '#F97316',
  pembe: '#EC4899',
  petrol: '#1F5F6B',
  pink: '#EC4899',
  pudra: '#E6BFBA',
  purple: '#9333EA',
  red: '#DC2626',
  sari: '#FACC15',
  siyah: '#111827',
  skyblue: '#BFD3E0',
  suyesili: '#8FD3C1',
  turkuaz: '#2BB5B0',
  turuncu: '#F97316',
  vizon: '#D2BCA2',
  white: '#FFFFFF',
  yellow: '#FACC15',
  yesil: '#16A34A',
  yulaf: '#DDCBB3',
}

const UNKNOWN_COLOR_HEX = '#ECE3D5'

function normalizeColorKey(color: string) {
  return color
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

// Iki renkli adlarin ("Beyaz-Pembe", "Siyah / Gri") bilinen parcalari.
function knownParts(color: string) {
  return color
    .split(/[-/&+,]/)
    .map((part) => COLOR_HEX[normalizeColorKey(part)])
    .filter((hex): hex is string => Boolean(hex))
}

export function getColorHex(color: string) {
  return COLOR_HEX[normalizeColorKey(color)] ?? knownParts(color)[0] ?? UNKNOWN_COLOR_HEX
}

// Renk kutucugu icin CSS `background` degeri: iki renkli adlar capraz bolunmus gosterilir.
export function getColorSwatch(color: string) {
  const single = COLOR_HEX[normalizeColorKey(color)]
  if (single) return single
  const [first, second] = knownParts(color)
  if (first && second) return `linear-gradient(135deg, ${first} 50%, ${second} 50%)`
  return first ?? UNKNOWN_COLOR_HEX
}
