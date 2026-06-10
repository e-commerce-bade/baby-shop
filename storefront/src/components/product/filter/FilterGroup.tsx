import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function FilterGroup({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-line py-4 first:border-t-0 first:pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <h4 className="text-sm font-extrabold text-brown">{title}</h4>
        <svg
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200',
            open ? 'rotate-180' : 'rotate-0',
          )}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-[280ms]',
          open ? 'mt-3 max-h-[400px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}
