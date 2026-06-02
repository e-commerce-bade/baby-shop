import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function FilterGroup({ title, defaultOpen = true, children }: Props) {
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
        <span
          className={cn(
            'text-lg leading-none text-muted transition-transform duration-200',
            open ? 'rotate-0' : 'rotate-45',
          )}
        >
          {open ? '—' : '+'}
        </span>
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
