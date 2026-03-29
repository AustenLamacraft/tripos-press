export interface Frontmatter {
  title: string
  type?: 'post' | 'slides'
  course?: string
  date?: string
  published?: boolean
  [key: string]: unknown
}

export interface RenderedPost {
  frontmatter: Frontmatter
  html: string
}

export interface RenderedSlides {
  frontmatter: Frontmatter
  /** HTML fragment for each slide section */
  slides: string[]
}
