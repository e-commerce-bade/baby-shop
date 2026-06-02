import { cn } from '@/lib/utils'

interface Props {
  name: string
  hex: string
  selected: boolean
  onToggle: () => void
}

export default function SwatchFilter({ name, hex, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={name}
      aria-label={`${name}${selected ? ' (seçili)' : ''}`}
      className={cn(
        'h-[26px] w-[26px] rounded-full border-2 border-white transition-transform duration-[180ms] hover:scale-110',
        selected ? 'shadow-[0_0_0_2px_#D2918D]' : 'shadow-[0_0_0_1px_#ECE3D6]',
      )}
      style={{ backgroundColor: hex }}
    />
  )
}
