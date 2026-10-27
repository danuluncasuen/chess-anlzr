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

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage unavailable (private mode etc.); the theme just won't persist.
  }
}
