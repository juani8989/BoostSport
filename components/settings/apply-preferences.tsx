'use client'

import { useEffect } from 'react'
import { useSettings } from '@/components/settings/use-settings'

const FONT_SIZE = { chico: '15px', normal: '16px', grande: '18px' } as const

/** Applies theme, text size, motion and contrast to the page. */
export function ApplyPreferences({ enabled }: { enabled: boolean }) {
  const { settings, ready } = useSettings(enabled)
  const { theme, textSize, reduceMotion, highContrast } = settings.app

  useEffect(() => {
    if (!ready) return
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const paint = () => root.classList.toggle('dark', theme === 'oscuro' || (theme === 'sistema' && media.matches))
    paint()
    media.addEventListener('change', paint)
    root.style.fontSize = FONT_SIZE[textSize]
    root.classList.toggle('reduce-motion', reduceMotion)
    root.classList.toggle('high-contrast', highContrast)
    return () => media.removeEventListener('change', paint)
  }, [ready, theme, textSize, reduceMotion, highContrast])

  return null
}
