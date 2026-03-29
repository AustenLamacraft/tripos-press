import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { EditorClient } from '@/components/editor/editor-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editor' }

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ postId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  const { postId } = await searchParams

  const courses = await db.course.findMany({
    where: { authorId: session.user.id },
    select: { id: true, slug: true, title: true },
    orderBy: { title: 'asc' },
  })

  let initialPost = null
  if (postId) {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: { course: { select: { authorId: true, slug: true } } },
    })
    // Ensure the post belongs to this user
    if (post && post.course.authorId === session.user.id) {
      initialPost = post
    }
  }

  return (
    <EditorClient
      initialPost={initialPost}
      courses={courses}
      username={session.user.username ?? session.user.id}
    />
  )
}
