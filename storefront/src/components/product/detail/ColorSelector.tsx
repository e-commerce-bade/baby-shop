import { getColorHex } from '@/lib/colors'
import { cn } from '@/lib/utils'

interface Props {
  colors: string[]
  selected: string
  onSelect: (color: string) => void
}

export default function ColorSelector({ colors, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2.5">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={`${color}${selected === color ? ' (secili)' : ''}`}
          onClick={() => onSelect(color)}
          className={cn(
            'h-8 w-8 rounded-full border-2 border-white transition-transform duration-[180ms] hover:scale-110',
            selected === color
              ? 'shadow-[0_0_0_2.5px_#D2918D]'
              : 'shadow-[0_0_0_1.5px_#ECE3D6]',
          )}
          style={{ backgroundColor: getColorHex(color) }}
        />
      ))}
    </div>
  )
}
