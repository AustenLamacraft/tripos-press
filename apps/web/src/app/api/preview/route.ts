import { NextRequest, NextResponse } from 'next/server'
import { renderPost, renderSlides } from '@tripos-press/content-pipeline'

interface PreviewBody {
  markdown: string
  type?: 'POST' | 'SLIDES'
}

export async function POST(req: NextRequest) {
  const { markdown, type = 'POST' }: PreviewBody = await req.json()

  if (!markdown) {
    return NextResponse.json({ html: '' })
  }

  if (type === 'SLIDES') {
    const { slides } = await renderSlides(markdown)
    return NextResponse.json({ slides })
  }

  const { html } = await renderPost(markdown)
  return NextResponse.json({ html })
}
