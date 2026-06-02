export interface Category {
  id: number
  parentId: number | null
  name: string
  slug: string
  description: string | null
  isActive: boolean
  sortOrder: number
}

export interface CategoryDisplayItem {
  id: number
  name: string
  slug: string
  emoji: string
  ageRange: string
  backgroundColor: string
}
