import { useNavigate } from 'react-router-dom'
import { Stethoscope, ClipboardList } from 'lucide-react'

const OPTIONS = [
  {
    id:          'aware',
    title:       'I know which specialist I need',
    sub:         'Browse our full clinician directory',
    path:        '/doctors',
    Icon:        Stethoscope,
    iconClass:   'text-[var(--color-primary)]',
    borderClass: 'border-t-[var(--color-primary)] hover:border-[var(--color-primary)]',
  },
  {
    id:          'unaware',
    title:       'I am unsure of my needs',
    sub:         'Let us help guide you to the right specialist',
    path:        '/find/triage',
    Icon:        ClipboardList,
    iconClass:   'text-[var(--color-accent)]',
    borderClass: 'border-t-[var(--color-accent)] hover:border-[var(--color-accent)]',
  },
]

export default function FindDoctor() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] mb-2">
            Unicorn
          </p>
          <h1 className="text-3xl font-bold text-[var(--color-primary)]">Find a Doctor</h1>
          <p className="text-lg text-slate-500 mt-2">How can we help you today?</p>
        </div>

        {/* Option cards */}
        <div className="space-y-4">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => navigate(opt.path)}
              className={`w-full bg-white rounded-xl border border-slate-200 border-t-4 ${opt.borderClass} shadow-sm px-6 py-5 flex items-center gap-3 text-left hover:shadow-md transition-all duration-150`}
            >
              <opt.Icon size={28} className={`${opt.iconClass} shrink-0`} />
              <div>
                <p className="font-semibold text-base text-[var(--color-dark)] leading-snug">
                  {opt.title}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">{opt.sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
