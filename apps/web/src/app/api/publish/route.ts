import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { renderPost, renderSlides } from '@tripos-press/content-pipeline'

interface PublishBody {
  postId?: string
  title: string
  type: 'POST' | 'SLIDES'
  courseId?: string
  /** Auto-create a course with this title if courseId is omitted */
  courseTitle?: string
  postSlug: string
  markdown: string
  published?: boolean
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body: PublishBody = await req.json()
  const { postId, title, type, postSlug, markdown, published = true } = body
  let { courseId, courseTitle } = body

  if (!title || !postSlug || !markdown) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Resolve or create the course
  if (!courseId) {
    if (!courseTitle) courseTitle = 'Uncategorized'
    const slug = courseTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const course = await db.course.upsert({
      where: { authorId_slug: { authorId: session.user.id, slug } },
      create: { slug, title: courseTitle, authorId: session.user.id },
      update: {},
    })
    courseId = course.id
  } else {
    // Verify ownership
    const course = await db.course.findUnique({ where: { id: courseId } })
    if (!course || course.authorId !== session.user.id) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
  }

  // Run the content pipeline
  let renderedHtml: string
  let slidesJson: string | null = null

  if (type === 'SLIDES') {
    const result = await renderSlides(markdown)
    // For slide posts, renderedHtml holds a simple summary; slides are in slidesJson
    renderedHtml = result.slides.join('\n')
    slidesJson = JSON.stringify(result.slides)
  } else {
    const result = await renderPost(markdown)
    renderedHtml = result.html
  }

  // Upsert the post
  const post = await db.post.upsert({
    where: postId
      ? { id: postId }
      : { courseId_slug: { courseId, slug: postSlug } },
    create: {
      slug: postSlug,
      title,
      type,
      sourceMd: markdown,
      renderedHtml,
      slidesJson,
      published,
      publishedAt: published ? new Date() : null,
      courseId,
    },
    update: {
      title,
      type,
      sourceMd: markdown,
      renderedHtml,
      slidesJson,
      published,
      publishedAt: published ? new Date() : undefined,
    },
    include: { course: { select: { slug: true, author: { select: { username: true } } } } },
  })

  const username = post.course.author.username
  const url = type === 'SLIDES'
    ? `/present/${username}/${post.course.slug}/${post.slug}`
    : `/${username}/${post.course.slug}/${post.slug}`

  return NextResponse.json({ post: { id: post.id }, url })
}
