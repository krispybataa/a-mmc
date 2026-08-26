// Centralized brand color values - keep numerically in sync with
// --color-primary / --color-accent in index.css. Needed here because several
// consumers can't read CSS custom properties directly: jsPDF (pdfService.js)
// and libraries that take a literal color string/array as a prop (recharts,
// react-body-highlighter, lucide-react's `color` prop).
export const COLOR_PRIMARY = '#1D409C'
export const COLOR_ACCENT = '#CE1117'

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
