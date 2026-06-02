import Link from 'next/link'
import type { CategoryDisplayItem } from '@/types/category'

interface Props {
  categories: CategoryDisplayItem[]
}

export default function CategoryStrip({ categories }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 max-[680px]:gap-2">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?categorySlug=${category.slug}`}
          className="group cursor-pointer overflow-hidden rounded-category border border-line bg-cream-3 pb-3 pt-0 text-center transition-[transform,box-shadow] duration-[220ms] hover:-translate-y-1 hover:shadow-card"
        >
          {/* Görsel alanı */}
          <div
            className="relative flex h-[80px] w-full items-center justify-center overflow-hidden max-[680px]:h-[60px]"
            style={{ backgroundColor: category.backgroundColor }}
          >
            {category.imageUrl ? (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="text-[32px] max-[680px]:text-[24px]">
                {category.emoji}
              </span>
            )}
          </div>

          {/* Başlık + yaş */}
          <div className="px-2 pt-2.5">
            <p className="font-serif text-[13.5px] font-semibold text-brown max-[680px]:text-[12px]">
              {category.name}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted">
              {category.ageRange}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
