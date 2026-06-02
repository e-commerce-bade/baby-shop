'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface AccordionSection {
  id: string
  title: string
  content: React.ReactNode
}

interface Props {
  sections: AccordionSection[]
}

export default function ProductAccordion({ sections }: Props) {
  const [openId, setOpenId] = useState<string>(sections[0]?.id ?? '')

  return (
    <div className="overflow-hidden rounded-card border border-line">
      {sections.map((section, i) => {
        const isOpen = openId === section.id
        return (
          <div
            key={section.id}
            className={cn('border-line', i < sections.length - 1 && 'border-b')}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? '' : section.id)}
              className="flex w-full items-center justify-between px-[22px] py-[18px] text-left text-sm font-bold text-brown transition-colors hover:bg-cream-3"
            >
              <span>{section.title}</span>
              <span className="text-xl font-normal leading-none text-muted">
                {isOpen ? '−' : '+'}
              </span>
            </button>

            <div
              className={cn(
                'overflow-hidden text-[13.5px] leading-[1.75] text-brown-2 transition-all duration-[280ms]',
                isOpen ? 'max-h-[400px] pb-5 opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <div className="px-[22px]">{section.content}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
