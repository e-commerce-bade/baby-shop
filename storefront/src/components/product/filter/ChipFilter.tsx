import { cn } from '@/lib/utils'

interface Props {
  label: string
  selected: boolean
  onToggle: () => void
}

export default function ChipFilter({ label, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'rounded-[10px] border px-3 py-2 text-[12.5px] font-bold transition-colors duration-[180ms]',
        selected
          ? 'border-rose bg-rose text-white'
          : 'border-line bg-white text-brown-2 hover:border-rose-soft',
      )}
    >
      {label}
    </button>
  )
}
