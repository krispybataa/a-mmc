import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const OPTIONS = [
  {
    id:      'aware',
    title:   'I know which specialist I need',
    sub:     'Browse our full clinician directory',
    path:    '/doctors',
  },
  {
    id:      'unaware',
    title:   'I am unsure of my needs',
    sub:     'Let us help guide you to the right specialist',
    path:    '/find/triage',
  },
]

export default function FindDoctor() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary-light)] mb-2">
            Unicorn
          </p>
          <h1 className="text-3xl font-bold text-[var(--color-dark)]">Find a Doctor</h1>
          <p className="text-lg text-slate-500 mt-2">How can we help you today?</p>
        </div>

        {/* Option cards */}
        <div className="space-y-4">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => navigate(opt.path)}
              className="w-full min-h-[80px] bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 flex items-center justify-between text-left hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-150"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-semibold text-base text-[var(--color-dark)] leading-snug">
                  {opt.title}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">{opt.sub}</p>
              </div>
              <ChevronRight size={20} className="text-slate-400 shrink-0" />
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
