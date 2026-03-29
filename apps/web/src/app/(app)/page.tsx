export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">Tripos Press</h1>
      <p className="text-xl text-gray-600 mb-8">
        Write and publish lecture notes and slides. Your files, your backups — just publish when
        you&apos;re ready.
      </p>
      <div className="flex gap-4 justify-center">
        <a
          href="/dashboard"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to dashboard
        </a>
        <a
          href="#how-it-works"
          className="px-5 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50"
        >
          How it works
        </a>
      </div>

      <section id="how-it-works" className="mt-32 text-left grid gap-10 md:grid-cols-3">
        {[
          {
            title: 'Write in Markdown',
            body: 'Use the in-browser editor or your own tools. Markdown with LaTeX — $e^{i\\pi}+1=0$ — renders with KaTeX.',
          },
          {
            title: 'Publish in one click',
            body: 'Click Publish and your notes are live at tripos.press/you/course/lecture. Slides use reveal.js automatically.',
          },
          {
            title: 'Local-first',
            body: 'Your source files live on your machine. The platform is just the renderer and host — not your source of truth.',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border p-6">
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
