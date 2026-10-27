import { useState } from 'react'
import { applyTheme, readTheme, type Theme } from '../theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const next: Theme = theme === 'night' ? 'cream' : 'night'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
    >
      {theme === 'night' ? '☀' : '☾'}
    </button>
  )
}
