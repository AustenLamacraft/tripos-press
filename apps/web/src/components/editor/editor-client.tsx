'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { PostType } from '@prisma/client'
import { useFileSystemFolder } from '@/hooks/useFileSystemFolder'

// CodeMirror must be loaded client-side only (browser APIs)
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false })

// Lazily imported to keep the initial bundle small
async function getMarkdownExtension() {
  const { markdown, markdownLanguage } = await import('@codemirror/lang-markdown')
  const { languages } = await import('@codemirror/language-data')
  return [markdown({ base: markdownLanguage, codeLanguages: languages })]
}

interface Course {
  id: string
  slug: string
  title: string
}

interface Post {
  id: string
  title: string
  slug: string
  type: PostType
  sourceMd: string
  published: boolean
  courseId: string
}

interface EditorClientProps {
  initialPost: Post | null
  courses: Course[]
  username: string
}

const DEFAULT_MARKDOWN = `---
title: Untitled
type: post
date: ${new Date().toISOString().slice(0, 10)}
published: false
---

## Introduction

Write your notes here. Math is supported inline: $e^{i\\pi} + 1 = 0$, and in display mode:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}
$$

---

<!-- Use --- to start a new slide (slides mode only) -->
`

export function EditorClient({ initialPost, courses, username }: EditorClientProps) {
  const [content, setContent] = useState(initialPost?.sourceMd ?? DEFAULT_MARKDOWN)
  const [title, setTitle] = useState(initialPost?.title ?? '')
  const [type, setType] = useState<PostType>(initialPost?.type ?? 'POST')
  const [courseId, setCourseId] = useState(initialPost?.courseId ?? courses[0]?.id ?? '')
  const [postSlug, setPostSlug] = useState(initialPost?.slug ?? '')
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [preview, setPreview] = useState<{ html?: string; slides?: string[] } | null>(null)
  const [status, setStatus] = useState<'idle' | 'publishing' | 'saved' | 'error'>('idle')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [extensions, setExtensions] = useState<Parameters<typeof CodeMirror>[0]['extensions']>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // File System Access API integration (Phase 7a)
  const folderHook = useFileSystemFolder()

  // Load CodeMirror extensions once on first mount
  const onEditorMount = useCallback(async () => {
    const exts = await getMarkdownExtension()
    setExtensions(exts)
  }, [])

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: value, type }),
        })
        const data = await res.json()
        setPreview(data)
      }, 600)
    },
    [type],
  )

  const handlePublish = async (publish: boolean) => {
    // Client-side validation
    const errors = []
    if (!title.trim()) errors.push('Title is required')
    if (!postSlug.trim()) errors.push('Slug is required')
    if (!content.trim()) errors.push('Content is required')
    if (!courseId && !newCourseTitle.trim()) errors.push('Course name is required for new posts')

    if (errors.length > 0) {
      setStatus('error')
      alert('Please fill in all fields:\n' + errors.join('\n'))
      return
    }

    setStatus('publishing')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: initialPost?.id,
          title: title.trim(),
          type,
          courseId: courseId || undefined,
          courseTitle: !courseId && newCourseTitle ? newCourseTitle.trim() : undefined,
          postSlug: postSlug.trim(),
          markdown: content,
          published: publish,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setPublishedUrl(data.url)

      // Phase 7a: After successful publish, sync metadata (save hashes to .tripos-press.json)
      if (folderHook.state.folderHandle) {
        await folderHook.syncMetadata()
      }

      setStatus('saved')
    } catch (err) {
      setStatus('error')
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const previewHtml =
    type === 'SLIDES'
      ? (preview?.slides ?? []).join('<hr />')
      : preview?.html ?? ''

  // Check if form is valid
  const isValid =
    title.trim() &&
    postSlug.trim() &&
    content.trim() &&
    (courseId || newCourseTitle.trim())

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b bg-gray-50 text-sm">
        <input
          className={`flex-1 min-w-48 font-medium text-base border-0 bg-transparent outline-none placeholder-gray-400 ${
            title.trim() ? '' : 'text-gray-400'
          }`}
          placeholder="Title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="border rounded px-2 py-1 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as PostType)}
        >
          <option value="POST">Post</option>
          <option value="SLIDES">Slides</option>
        </select>

        {courses.length > 0 ? (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">+ New course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        ) : null}

        {!courseId && (
          <input
            className={`border rounded px-2 py-1 text-sm w-40 ${
              newCourseTitle.trim() ? '' : 'border-orange-300 bg-orange-50'
            }`}
            placeholder="Course name (required for new)"
            value={newCourseTitle}
            onChange={(e) => setNewCourseTitle(e.target.value)}
          />
        )}

        <input
          className={`border rounded px-2 py-1 text-sm w-36 ${
            postSlug.trim() ? '' : 'border-orange-300 bg-orange-50'
          }`}
          placeholder="post-slug (required)"
          value={postSlug}
          onChange={(e) => setPostSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
        />

        <button
          onClick={() => handlePublish(false)}
          disabled={!isValid || status === 'publishing'}
          className={`px-3 py-1 border rounded text-gray-700 ${
            isValid && status !== 'publishing'
              ? 'hover:bg-gray-100 cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }`}
          title={!isValid ? 'Fill in all required fields' : ''}
        >
          Save draft
        </button>
        <button
          onClick={() => handlePublish(true)}
          disabled={!isValid || status === 'publishing'}
          className={`px-3 py-1 bg-blue-600 text-white rounded ${
            isValid && status !== 'publishing'
              ? 'hover:bg-blue-700 cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
          }`}
          title={!isValid ? 'Fill in all required fields' : ''}
        >
          {status === 'publishing' ? 'Publishing…' : 'Publish'}
        </button>

        {status === 'saved' && publishedUrl && (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline"
          >
            View ↗
          </a>
        )}
        {status === 'error' && <span className="text-red-600">Error — check console</span>}

        {/* ── Phase 7a: Folder open button ──────────────────────────────────── */}
        <div className="ml-auto flex items-center gap-2 border-l pl-3">
          {folderHook.state.folderHandle ? (
            <>
              <div className="text-xs text-gray-600">
                <span className="font-medium">{folderHook.state.folderName}</span>
                {folderHook.state.changes && (
                  <span className="ml-2 text-gray-500">
                    {folderHook.state.changes.modified.length > 0 && (
                      <span className="text-orange-600">
                        {folderHook.state.changes.modified.length} modified
                      </span>
                    )}
                    {folderHook.state.changes.new.length > 0 && (
                      <span className={folderHook.state.changes.modified.length > 0 ? ' • ' : ''}>
                        <span className="text-blue-600">
                          {folderHook.state.changes.new.length} new
                        </span>
                      </span>
                    )}
                    {folderHook.state.changes.unchanged.length > 0 && (
                      <span className="ml-2 text-gray-400">
                        {folderHook.state.changes.unchanged.length} unchanged
                      </span>
                    )}
                  </span>
                )}
              </div>
              <button
                onClick={() => folderHook.closeFolder()}
                className="py-1 px-2 rounded text-xs text-gray-600 hover:bg-gray-200"
                title="Close folder"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => folderHook.openFolder()}
              disabled={folderHook.state.isLoading}
              className={`py-1 px-2 rounded text-xs ${
                folderHook.state.isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200 cursor-pointer'
              }`}
              title="Open local folder (Phase 7a)"
            >
              {folderHook.state.isLoading ? 'Opening…' : '📁 Open folder'}
            </button>
          )}
          {folderHook.state.error && (
            <span className="text-xs text-red-600">{folderHook.state.error}</span>
          )}
        </div>
      </div>

      {/* ── Folder panel (Phase 7a) ──────────────────────────────────── */}
      {folderHook.state.folderHandle && folderHook.state.changes && (
        <div className="border-b bg-blue-50 px-4 py-2 text-xs">
          <details className="space-y-1">
            <summary className="cursor-pointer font-medium text-blue-900">
              📂 {folderHook.state.folderName} — {folderHook.state.changes.modified.length + folderHook.state.changes.new.length} changes
            </summary>
            <div className="pl-4 space-y-1 max-h-32 overflow-y-auto text-gray-700">
              {folderHook.state.changes.modified.length > 0 && (
                <>
                  <div className="font-medium text-orange-700">Modified:</div>
                  {folderHook.state.changes.modified.map((f) => (
                    <div key={f} className="pl-2 text-orange-600">
                      • {f}
                    </div>
                  ))}
                </>
              )}
              {folderHook.state.changes.new.length > 0 && (
                <>
                  <div className="font-medium text-blue-700">New:</div>
                  {folderHook.state.changes.new.map((f) => (
                    <div key={f} className="pl-2 text-blue-600">
                      • {f}
                    </div>
                  ))}
                </>
              )}
            </div>
          </details>
        </div>
      )}

      {/* ── Editor / Preview split ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div className="flex-1 overflow-auto font-mono text-sm" onFocus={onEditorMount}>
          <CodeMirror
            value={content}
            extensions={extensions}
            onChange={handleContentChange}
            height="100%"
            className="h-full"
          />
        </div>

        {/* Preview pane */}
        <div className="flex-1 overflow-auto border-l px-8 py-6">
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400 text-sm">Preview will appear here…</p>' }}
          />
        </div>
      </div>
    </div>
  )
}
