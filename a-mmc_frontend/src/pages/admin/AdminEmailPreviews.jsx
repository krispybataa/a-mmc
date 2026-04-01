import { useState, useEffect, useRef } from 'react'
import { Copy, Check } from 'lucide-react'
import api from '../../services/api'

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-200 rounded-lg" />
      ))}
    </div>
  )
}

// ── Template list item ─────────────────────────────────────────────────────────

function TemplateItem({ item, selected, onClick }) {
  const isActive = selected?.id === item.id
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={[
        'w-full text-left px-4 py-3 rounded-lg transition-colors min-h-[44px]',
        isActive
          ? 'bg-[var(--color-primary)] text-white'
          : 'text-[var(--color-dark)] hover:bg-slate-100',
      ].join(' ')}
    >
      <p className={[
        'text-sm font-semibold leading-snug',
        isActive ? 'text-white' : 'text-[var(--color-dark)]',
      ].join(' ')}>
        {item.label}
      </p>
      <p className={[
        'text-xs mt-0.5 truncate',
        isActive ? 'text-white/70' : 'text-slate-400',
      ].join(' ')}>
        {item.subject}
      </p>
    </button>
  )
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ html }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200
                 text-sm font-medium text-[var(--color-dark)] hover:bg-slate-50
                 transition-colors min-h-[44px]"
    >
      {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
      {copied ? 'Copied!' : 'Copy HTML'}
    </button>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminEmailPreviews() {
  const [previews, setPreviews]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // All hooks above any conditional return
  useEffect(() => {
    api.get('/admin/email-previews')
      .then(res => {
        setPreviews(res.data)
        setSelected(res.data[0] ?? null)
      })
      .catch(() => setError('Failed to load email previews. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">

      {/* ── Left panel — template list ── */}
      <aside className="
        md:w-72 md:min-h-screen md:border-r md:border-slate-200
        bg-white shrink-0
      ">
        {/* Panel header */}
        <div className="px-5 py-5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-[var(--color-dark)]">Email Previews</h1>
          <p className="text-xs text-slate-400 mt-0.5">8 templates</p>
        </div>

        {/* Template list — desktop vertical, mobile horizontal scroll */}
        {loading ? (
          <Skeleton />
        ) : error ? (
          <p className="px-5 py-4 text-sm text-[var(--color-accent)]">{error}</p>
        ) : (
          <>
            {/* Desktop list */}
            <nav className="hidden md:block p-3 space-y-1 overflow-y-auto">
              {previews.map(item => (
                <TemplateItem
                  key={item.id}
                  item={item}
                  selected={selected}
                  onClick={setSelected}
                />
              ))}
            </nav>

            {/* Mobile — horizontal scrollable pill strip */}
            <div className="md:hidden flex gap-2 px-4 py-3 overflow-x-auto">
              {previews.map(item => {
                const isActive = selected?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={[
                      'shrink-0 px-4 py-2 rounded-full text-sm font-medium',
                      'border transition-colors min-h-[44px] whitespace-nowrap',
                      isActive
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white text-[var(--color-dark)] border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </aside>

      {/* ── Right panel — email preview ── */}
      <main className="flex-1 flex flex-col p-6 md:p-8 min-w-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-slate-200
                            border-t-[var(--color-primary)] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--color-accent)]">{error}</p>
          </div>
        ) : !selected ? null : (
          <>
            {/* Subject + actions */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest
                               text-[var(--color-primary-light)] mb-1">
                  {selected.label}
                </p>
                <h2 className="text-xl font-bold text-[var(--color-dark)] leading-snug">
                  {selected.subject}
                </h2>
              </div>
              <CopyButton html={selected.html} />
            </div>

            {/* Email iframe */}
            <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden
                            shadow-sm bg-white">
              <iframe
                key={selected.id}
                srcDoc={selected.html}
                title={`Preview: ${selected.label}`}
                className="w-full border-none"
                style={{ minHeight: '600px', height: '100%', display: 'block' }}
                sandbox="allow-same-origin"
              />
            </div>

            {/* Footer note */}
            <p className="mt-3 text-xs text-slate-400">
              This is a preview only. Email delivery requires SMTP configuration
              (set <code className="font-mono bg-slate-100 px-1 rounded">MAIL_USERNAME</code> in
              the environment).
            </p>
          </>
        )}
      </main>

    </div>
  )
}
