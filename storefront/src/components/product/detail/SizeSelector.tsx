import { cn } from '@/lib/utils'

interface SizeOption {
  label: string
  inStock: boolean
}

interface Props {
  sizes: SizeOption[]
  selected: string | null
  onSelect: (size: string) => void
}

export default function SizeSelector({ sizes, selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map(({ label, inStock }) => (
        <button
          key={label}
          type="button"
          disabled={!inStock}
          onClick={() => inStock && onSelect(label)}
          className={cn(
            'rounded-[10px] border px-4 py-2 text-[13px] font-bold transition-colors duration-[180ms]',
            !inStock && 'cursor-not-allowed line-through opacity-40 border-line-2 text-muted bg-white',
            inStock && selected === label && 'bg-brown border-brown text-white',
            inStock && selected !== label && 'border-line bg-white text-brown-2 hover:border-rose-soft',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
