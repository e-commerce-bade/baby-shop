import { cn } from '@/lib/utils'

interface Props {
  label: string
  count?: number
  checked: boolean
  onChange: () => void
}

export default function CheckboxFilter({ label, count, checked, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-[5px] text-[13.5px] text-brown-2">
      <span
        onClick={onChange}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onChange()}
        className={cn(
          'relative h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-[1.5px] transition-colors duration-150',
          checked
            ? 'border-rose bg-rose'
            : 'border-muted-2 bg-white',
        )}
      >
        {checked && (
          <svg
            className="absolute left-[3px] top-[1px]"
            width="9"
            height="9"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M1.5 5l2.5 3 5-6"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs font-semibold text-muted">{count}</span>
      )}
    </label>
  )
}
