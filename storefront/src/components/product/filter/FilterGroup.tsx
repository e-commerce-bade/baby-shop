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

      {/* Acik grubun yuksekligi icerigine gore belirlenir (0fr -> 1fr gecisi). Sabit bir ust sinir
          yok: eski 400px sinirinda uzun beden listesinin sonundaki secenekler kesilip secilemiyordu. */}
      <div
        className={cn(
          'grid transition-all duration-[280ms]',
          open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        {/* Kapaliyken icerik klavye ve ekran okuyucu icin de devre disidir (Tab gizli seceneklere gitmez). */}
        <div className="overflow-hidden" inert={!open}>{children}</div>
      </div>
    </div>
  )
}
