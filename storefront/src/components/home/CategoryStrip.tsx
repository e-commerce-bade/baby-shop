import Link from 'next/link'
import type { CategoryDisplayItem } from '@/types/category'

interface Props {
  categories: CategoryDisplayItem[]
}

export default function CategoryStrip({ categories }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 max-[680px]:gap-2.5">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?categorySlug=${category.slug}`}
          className="group cursor-pointer rounded-category border border-line bg-cream-3 px-3 pb-[18px] pt-4 text-center transition-[transform,box-shadow,background-color] duration-[220ms] hover:-translate-y-1 hover:bg-white hover:shadow-card"
        >
          <div
            className="mb-2.5 flex h-[72px] items-center justify-center rounded-thumb text-[34px] max-[680px]:h-[54px] max-[680px]:text-[26px]"
            style={{ backgroundColor: category.backgroundColor }}
          >
            {category.emoji}
          </div>
          <div className="font-serif text-base font-semibold text-brown max-[680px]:text-[13px]">
            {category.name}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-muted">
            {category.ageRange}
          </div>
        </Link>
      ))}
    </div>
  )
}
