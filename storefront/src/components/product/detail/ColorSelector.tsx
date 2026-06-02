import { cn } from '@/lib/utils'

const COLOR_HEX: Record<string, string> = {
  Yulaf:       '#DDCBB3',
  Pudra:       '#E6BFBA',
  'Gök Mavisi': '#BFD3E0',
  Adaçayı:     '#C2D2AE',
  Vizon:       '#D2BCA2',
  'Açık Pembe': '#E3B9B4',
  Kahve:       '#5B4839',
  Beyaz:       '#ffffff',
  Naturel:     '#D6C3A9',
  Gök:         '#BFD3E0',
  Çiçekli:     '#E6BFBA',
}

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
          aria-label={`${color}${selected === color ? ' (seçili)' : ''}`}
          onClick={() => onSelect(color)}
          className={cn(
            'h-8 w-8 rounded-full border-2 border-white transition-transform duration-[180ms] hover:scale-110',
            selected === color
              ? 'shadow-[0_0_0_2.5px_#D2918D]'
              : 'shadow-[0_0_0_1.5px_#ECE3D6]',
          )}
          style={{ backgroundColor: COLOR_HEX[color] ?? '#ECE3D5' }}
        />
      ))}
    </div>
  )
}
