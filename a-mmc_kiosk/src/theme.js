// Centralized brand color values - keep numerically in sync with
// --color-primary / --color-accent in index.css. Needed here because several
// consumers can't read CSS custom properties directly: libraries that take a
// literal color string as a prop (react-body-highlighter, lucide-react's
// `color` prop).
export const COLOR_PRIMARY = '#1D409C'
export const COLOR_ACCENT = '#CE1117'
