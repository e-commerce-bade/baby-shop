'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import RabbitLoader from '@/components/ui/RabbitLoader'

type Phase = 'idle' | 'start' | 'running' | 'done'

const MAX_NAVIGATION_MS = 4500

export default function NavigationProgress() {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [phase, setPhase] = useState<Phase>('idle')
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function clearTimers() {
    clearTimeout(doneTimer.current)
    clearTimeout(idleTimer.current)
    clearTimeout(fallbackTimer.current)
  }

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return

      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return

      const target = new URL(href, window.location.href)
      if (target.origin !== window.location.origin) return
      if (`${target.pathname}${target.search}` === `${window.location.pathname}${window.location.search}`) return

      clearTimers()
      setPhase('start')
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('running')))
      fallbackTimer.current = setTimeout(() => setPhase('idle'), MAX_NAVIGATION_MS)
    }

    document.addEventListener('click', onLinkClick, true)
    return () => document.removeEventListener('click', onLinkClick, true)
  }, [])

  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    clearTimers()
    setPhase('done')
    doneTimer.current = setTimeout(() => {
      idleTimer.current = setTimeout(() => setPhase('idle'), 300)
    }, 120)
  }, [pathname])

  useEffect(() => clearTimers, [])

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
