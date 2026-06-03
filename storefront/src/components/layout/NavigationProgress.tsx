'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import RabbitLoader from '@/components/ui/RabbitLoader'

type Phase = 'idle' | 'start' | 'running' | 'done'

export default function NavigationProgress() {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [phase, setPhase] = useState<Phase>('idle')
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Detect link clicks → start overlay
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return
      if (href.split('?')[0] === pathname) return

      clearTimeout(doneTimer.current)
      clearTimeout(idleTimer.current)
      setPhase('start')
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('running')))
    }

    document.addEventListener('click', onLinkClick, true)
    return () => document.removeEventListener('click', onLinkClick, true)
  }, [pathname])

  // Navigation complete
  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    clearTimeout(doneTimer.current)
    clearTimeout(idleTimer.current)
    setPhase('done')
    doneTimer.current = setTimeout(() => {
      idleTimer.current = setTimeout(() => setPhase('idle'), 300)
    }, 120)
  }, [pathname])

  if (phase === 'idle') return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: 'rgba(251,246,241,0.75)',
        backdropFilter: 'blur(4px)',
        opacity: phase === 'done' ? 0 : 1,
        transition: 'opacity 300ms ease',
      }}
    >
      <RabbitLoader />
    </div>
  )
}
