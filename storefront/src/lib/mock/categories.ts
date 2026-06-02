import type { CategoryDisplayItem } from '@/types/category'

export const mockCategoryStrip: CategoryDisplayItem[] = [
  {
    id: 1,
    name: 'Yeni Doğan',
    slug: 'yeni-dogan',
    emoji: '🧥',
    ageRange: '0–24 Ay',
    backgroundColor: '#EFE6D9',
  },
  {
    id: 2,
    name: 'Kız Çocuk',
    slug: 'kiz-cocuk',
    emoji: '👗',
    ageRange: '0–7 Yaş',
    backgroundColor: '#F4DEDB',
  },
  {
    id: 3,
    name: 'Erkek Çocuk',
    slug: 'erkek-cocuk',
    emoji: '🧸',
    ageRange: '0–7 Yaş',
    backgroundColor: '#D9E4EC',
  },
]
