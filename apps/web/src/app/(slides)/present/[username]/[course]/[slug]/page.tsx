import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { RevealSlides } from '@/components/slides/reveal-slides'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ username: string; course: string; slug: string }>
}

/**
 * ISR: Revalidate published slides every hour.
 * Note: This caches the full slide deck HTML. For ENROLLED-only courses, consider disabling ISR
 * (revalidate = 0) or use tag-based revalidation to invalidate on enrollment changes.
 */
export const revalidate = 3600 // 1 hour

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, course, slug } = await params
  const post = await db.post.findFirst({
    where: { slug, published: true, course: { slug: course, author: { username } } },
    select: { title: true },
  })
  return { title: post?.title ?? 'Slides' }
}

export default async function PresentPage({ params }: Props) {
  const { username, course, slug } = await params
  const session = await auth()

  const post = await db.post.findFirst({
    where: {
      slug,
      published: true,
      type: 'SLIDES',
      course: { slug: course, author: { username } },
    },
    include: {
      course: { select: { visibility: true, title: true, author: { select: { username: true, name: true } } } },
    },
  })

  if (!post) notFound()

  // Access control
  if (post.course.visibility === 'ENROLLED') {
    if (!session?.user.id) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <h1>Restricted</h1>
          <p>You must be enrolled to view this presentation.</p>
        </div>
      )
    }
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: post.courseId } },
    })
    if (!enrollment) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <h1>Restricted</h1>
          <p>Enrollment required.</p>
        </div>
      )
    }
  }

  const slides: string[] = JSON.parse(post.slidesJson ?? '[]')

  return <RevealSlides slides={slides} title={post.title} />
}
