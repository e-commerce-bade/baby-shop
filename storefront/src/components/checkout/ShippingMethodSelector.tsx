'use client'

import { formatPrice } from '@/lib/utils'

export interface ShippingOption {
  id: string
  label: string
  description: string
  price: number
  currency: string
}

const DEFAULT_OPTIONS: ShippingOption[] = [
  { id: 'standard',  label: 'Standart Kargo', description: '5-7 iş günü',  price: 99,  currency: 'TRY' },
  { id: 'expedited', label: 'Hızlı Kargo',    description: '2-3 iş günü',  price: 149, currency: 'TRY' },
  { id: 'express',   label: 'Ekspres Kargo',  description: '1-2 iş günü',  price: 249, currency: 'TRY' },
]

interface Props {
  options?: ShippingOption[]
  selected: string
  onChange: (id: string) => void
}

export default function ShippingMethodSelector({
  options = DEFAULT_OPTIONS,
  selected,
  onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt) => {
        const isSelected = opt.id === selected
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={[
              'flex items-center justify-between rounded-[14px] border px-4 py-3.5 text-left transition-colors',
              isSelected
                ? 'border-rose bg-rose-tint'
                : 'border-line bg-cream-3 hover:border-rose-soft hover:bg-cream-2',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              {/* Radio indicator */}
              <span
                className={[
                  'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                  isSelected ? 'border-rose' : 'border-line',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-rose" />
                )}
              </span>
              <div>
                <p className="text-[13.5px] font-semibold text-brown">{opt.label}</p>
                <p className="text-[12px] text-muted">{opt.description}</p>
              </div>
            </div>
            <span className={[
              'text-[13.5px] font-bold',
              isSelected ? 'text-rose-dk' : 'text-brown',
            ].join(' ')}>
              {opt.price === 0 ? 'Ücretsiz' : formatPrice(opt.price, opt.currency)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
