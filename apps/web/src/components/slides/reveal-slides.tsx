'use client'

import { useEffect, useRef } from 'react'

interface RevealSlidesProps {
  slides: string[]
  title: string
}

/**
 * Client component that initialises a reveal.js deck from pre-rendered HTML
 * slide fragments. Each string in `slides` is the innerHTML for one
 * horizontal slide (which may itself contain nested `<section>` elements for
 * vertical sub-slides).
 */
export function RevealSlides({ slides, title }: RevealSlidesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let deck: { destroy: () => void } | null = null

    ;(async () => {
      const { default: Reveal } = await import('reveal.js')

      if (!containerRef.current) return

      deck = new Reveal(containerRef.current, {
        hash: true,
        controls: true,
        progress: true,
        center: true,
        transition: 'slide',
      })

      await (deck as unknown as { initialize: () => Promise<void> }).initialize()
    })()

    return () => {
      deck?.destroy()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="reveal"
      style={{ width: '100vw', height: '100vh' }}
    >
      <div className="slides">
        {slides.map((html, i) =>
          html.trimStart().startsWith('<section>') ? (
            // vertical sub-slides — already wrapped, render as-is
            <section key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <section key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ),
        )}
      </div>
    </div>
  )
}
