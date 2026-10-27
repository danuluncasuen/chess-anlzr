// Night (charcoal) is the default theme; cream is the light alternative.
// index.html applies a saved choice before first paint, so this key is repeated there.
export type Theme = 'night' | 'cream'

const THEME_KEY = 'chess-anlzr:theme'

export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'cream' ? 'cream' : 'night'
  } catch {
    return 'night'
  }
}

/** Browser/phone status bar color for each theme (matches the page background). */
const THEME_COLOR: Record<Theme, string> = { night: '#212121', cream: '#ffe2bd' }

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage unavailable (private mode etc.); the theme just won't persist.
  }
}
