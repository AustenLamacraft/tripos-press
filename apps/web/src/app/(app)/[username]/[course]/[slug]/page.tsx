import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ username: string; course: string; slug: string }>
}

/**
 * ISR: Revalidate published posts every hour.
 * Note: This caches the full HTML response. For ENROLLED-only courses, consider disabling ISR
 * (revalidate = 0) or use tag-based revalidation to invalidate on enrollment changes.
 */
export const revalidate = 3600 // 1 hour

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, course, slug } = await params
  const post = await getPost(username, course, slug)
  if (!post) return {}
  return { title: post.title }
}

async function getPost(username: string, courseSlug: string, postSlug: string) {
  return db.post.findFirst({
    where: {
      slug: postSlug,
      published: true,
      course: {
        slug: courseSlug,
        author: { username },
      },
    },
    include: {
      course: {
        select: { title: true, slug: true, visibility: true, author: { select: { username: true, name: true } } },
      },
    },
  })
}

async function canView(post: Awaited<ReturnType<typeof getPost>>, userId: string | undefined) {
  if (!post) return false
  if (post.course.visibility === 'PUBLIC') return true
  if (!userId) return false
  // ENROLLED: check enrollment
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: post.courseId } },
  })
  return enrollment !== null
}

export default async function PostPage({ params }: Props) {
  const { username, course, slug } = await params
  const session = await auth()
  const post = await getPost(username, course, slug)

  if (!post) notFound()

  const allowed = await canView(post, session?.user.id)
  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Restricted content</h1>
        <p className="text-gray-600">You must be enrolled in this course to view this material.</p>
      </div>
    )
  }

  if (post.type === 'SLIDES') {
    const slides: string[] = JSON.parse(post.slidesJson ?? '[]')
    return (
      <meta
        httpEquiv="refresh"
        content={`0; url=/present/${username}/${course}/${slug}`}
      />
    )
  }

  const author = post.course.author

  return (
    <article className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <p className="text-sm text-gray-500 mb-2">
          <a href={`/${username}`} className="hover:underline">
            {author.name ?? author.username}
          </a>
          {' / '}
          <a href={`/${username}/${course}`} className="hover:underline">
            {post.course.title}
          </a>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
      </header>
      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: post.renderedHtml }}
      />
    </article>
  )
}
