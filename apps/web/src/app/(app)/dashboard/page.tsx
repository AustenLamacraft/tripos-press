import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/api/auth/signin')

  const courses = await db.course.findMany({
    where: { authorId: session.user.id },
    include: {
      posts: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, type: true, published: true, slug: true, updatedAt: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const username = session.user.username

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <a
          href="/dashboard/editor"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          New post
        </a>
      </div>

      {courses.length === 0 && (
        <div className="border rounded-xl p-12 text-center text-gray-500">
          <p className="mb-4">No courses yet.</p>
          <a href="/dashboard/editor" className="text-blue-600 hover:underline text-sm">
            Create your first post →
          </a>
        </div>
      )}

      <div className="space-y-8">
        {courses.map((course) => (
          <section key={course.id}>
            <h2 className="text-lg font-semibold mb-3">
              {course.title}{' '}
              <span className="text-sm font-normal text-gray-500">/{course.slug}</span>
            </h2>
            <div className="border rounded-xl divide-y">
              {course.posts.map((post) => (
                <div key={post.id} className="flex items-center px-4 py-3 gap-4">
                  <span className="text-xs uppercase tracking-wide text-gray-400 w-14">
                    {post.type === 'SLIDES' ? 'Slides' : 'Post'}
                  </span>
                  <span className="flex-1 font-medium text-sm">{post.title}</span>
                  {post.published && username && (
                    <a
                      href={`/${username}/${course.slug}/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-blue-600"
                    >
                      View ↗
                    </a>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      post.published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                  <a
                    href={`/dashboard/editor?postId=${post.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </a>
                </div>
              ))}
              {course.posts.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">No posts yet.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
