const COLOR_HEX: Record<string, string> = {
  acikmavi: '#93C5FD',
  acikpembe: '#F9A8C0',
  adacayi: '#C2D2AE',
  beige: '#D6C3A9',
  bej: '#D6C3A9',
  beyaz: '#FFFFFF',
  black: '#111827',
  blue: '#2563EB',
  brown: '#8B5E34',
  cream: '#F4EEE6',
  ecru: '#EFE6D9',
  ekru: '#EFE6D9',
  gray: '#9CA3AF',
  green: '#16A34A',
  gri: '#9CA3AF',
  gok: '#BFD3E0',
  gokmavisi: '#BFD3E0',
  kahve: '#8B5E34',
  kahverengi: '#8B5E34',
  krem: '#F4EEE6',
  kirmizi: '#DC2626',
  lacivert: '#1E3A8A',
  mavi: '#2563EB',
  mor: '#9333EA',
  naturel: '#D6C3A9',
  navy: '#1E3A8A',
  orange: '#F97316',
  pembe: '#EC4899',
  pink: '#EC4899',
  pudra: '#E6BFBA',
  purple: '#9333EA',
  red: '#DC2626',
  sari: '#FACC15',
  siyah: '#111827',
  skyblue: '#BFD3E0',
  turuncu: '#F97316',
  vizon: '#D2BCA2',
  white: '#FFFFFF',
  yellow: '#FACC15',
  yesil: '#16A34A',
  yulaf: '#DDCBB3',
}

function normalizeColorKey(color: string) {
  return color
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function getColorHex(color: string) {
  return COLOR_HEX[normalizeColorKey(color)] ?? '#ECE3D5'
}
