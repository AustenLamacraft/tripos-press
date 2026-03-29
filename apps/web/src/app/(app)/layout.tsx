import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { auth } from '@/lib/auth'
import { signIn, signOut } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Tripos Press', template: '%s | Tripos Press' },
  description: 'Publish lecture notes and slides for university courses.',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b px-6 py-3 flex items-center justify-between bg-white">
          <a href="/" className="font-semibold text-lg tracking-tight">
            Tripos Press
          </a>
          <nav className="flex items-center gap-6 text-sm">
            {session ? (
              <>
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </a>
                <span className="text-gray-400">
                  {session.user.username ?? session.user.name}
                </span>
                <form
                  action={async () => {
                    'use server'
                    await signOut()
                  }}
                >
                  <button type="submit" className="text-gray-500 hover:text-gray-900">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <form
                action={async () => {
                  'use server'
                  await signIn('github')
                }}
              >
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700"
                >
                  Sign in with GitHub
                </button>
              </form>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
