import type { Metadata } from 'next'
import 'reveal.js/dist/reveal.css'
import 'reveal.js/dist/theme/white.css'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'

export const metadata: Metadata = {
  title: { default: 'Tripos Press', template: '%s | Tripos Press' },
}

/**
 * Minimal root layout for the /present/* route group.
 * Loads reveal.js CSS without the app chrome (no nav header).
 */
export default function SlidesRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#fff' }}>{children}</body>
    </html>
  )
}
