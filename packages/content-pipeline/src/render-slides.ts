import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'
import type { Frontmatter, RenderedSlides } from './types'

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeHighlight)
  .use(rehypeStringify)

/**
 * Splits on `\n---\n` (reveal.js convention for horizontal slide breaks).
 * Vertical sub-slides use `\n--\n` — a triple-dash is kept for horizontal only.
 *
 * Note: a `---` inside a fenced code block would incorrectly split. For
 * university content this is an acceptable edge case at MVP stage.
 */
export async function renderSlides(source: string): Promise<RenderedSlides> {
  const { data: frontmatter, content } = matter(source)

  // Support both `\n---\n` (horizontal) and `\n--\n` (vertical sub-slides).
  // We split into [horizontal, [vertical, vertical, ...]] pairs.
  const horizontalSections = content.split(/\n---\n/)

  const slides = await Promise.all(
    horizontalSections.map(async (section) => {
      const verticalSlides = section.split(/\n--\n/)
      if (verticalSlides.length === 1) {
        const result = await processor.process(section.trim())
        return String(result)
      }
      // Multiple vertical sub-slides — wrap each in a nested <section>
      const rendered = await Promise.all(
        verticalSlides.map(async (s) => {
          const result = await processor.process(s.trim())
          return `<section>${String(result)}</section>`
        }),
      )
      return rendered.join('\n')
    }),
  )

  return {
    frontmatter: frontmatter as Frontmatter,
    slides,
  }
}
