import type { CategoryDisplayItem } from '@/types/category'

export const mockCategoryStrip: CategoryDisplayItem[] = [
  {
    id: 1,
    name: 'Yenidoğan',
    slug: 'yenidogan',
    emoji: '🍼',
    backgroundColor: '#EFE6D9',
    imageUrl: '/images/category_newborn.png',
  },
  {
    id: 2,
    name: 'Kız Bebek',
    slug: 'kiz-bebek',
    emoji: '🎀',
    backgroundColor: '#F4DEDB',
    imageUrl: '/images/category_girl.png',
  },
  {
    id: 3,
    name: 'Erkek Bebek',
    slug: 'erkek-bebek',
    emoji: '🧸',
    backgroundColor: '#D9E4EC',
    imageUrl: '/images/category_boy.png',
  },
  {
    id: 4,
    name: 'Kız Çocuk',
    slug: 'kiz-cocuk',
    emoji: '👗',
    backgroundColor: '#F0E1DD',
    imageUrl: '/images/category_girl.png',
  },
  {
    id: 5,
    name: 'Erkek Çocuk',
    slug: 'erkek-cocuk',
    emoji: '🌿',
    backgroundColor: '#E4EBD9',
    imageUrl: '/images/category_boy.png',
  },
]
