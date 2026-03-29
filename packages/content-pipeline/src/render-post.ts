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
import type { Frontmatter, RenderedPost } from './types'

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter) // skip the frontmatter block rather than rendering it as a heading
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeHighlight)
  .use(rehypeStringify)

export async function renderPost(source: string): Promise<RenderedPost> {
  const { data: frontmatter, content } = matter(source)
  const result = await processor.process(content)
  return {
    frontmatter: frontmatter as Frontmatter,
    html: String(result),
  }
}
