import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { LANGUAGES } from '../data/homeStrings'
import { COLOR_PRIMARY as PRIMARY } from '../theme'

// Touch-friendly language selector for the kiosk home screen (mission
// F-KIOSKLANG-1). Demo-quality placeholder: it only switches the small local
// HOME_STRINGS lookup, it is not wired to a real i18n system.
//
// Sizing follows the kiosk's large-touch-target convention (rows/trigger are
// 72px+ tall) used by the mode buttons elsewhere in this app.
export default function LanguageSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === value) || LANGUAGES[0]

  function pick(code) {
    onChange(code)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          minHeight: '72px',
          minWidth: '220px',
          padding: '0 20px',
          borderRadius: '14px',
          backgroundColor: '#fff',
          border: `2px solid ${open ? PRIMARY : '#E2E0F0'}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          cursor: 'pointer',
        }}
      >
        {/*
          PLACEHOLDER flag emoji (confirmed OK for the demo with Gus).
          Swap these for real flag icon assets when this feature is built
          for real -- the emoji are a stopgap, not a finished decision.
        */}
        <span style={{ fontSize: '34px', lineHeight: 1 }}>{current.flag}</span>
        <span style={{ flex: 1, textAlign: 'left', fontSize: '22px', fontWeight: 700, color: '#1E1B4B' }}>
          {current.endonym}
        </span>
        <ChevronDown
          size={24}
          color="#6B7280"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <>
          {/* click/tap-away catcher */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <ul
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 20,
              listStyle: 'none',
              margin: 0,
              padding: '6px',
              minWidth: '260px',
              borderRadius: '14px',
              backgroundColor: '#fff',
              border: '2px solid #E2E0F0',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            }}
          >
            {LANGUAGES.map(lang => {
              const selected = lang.code === value
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(lang.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      width: '100%',
                      minHeight: '72px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: selected ? '#F1F0FB' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F0FB' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = selected ? '#F1F0FB' : 'transparent' }}
                  >
                    {/* PLACEHOLDER flag emoji -- see note above; swap for real icon assets later. */}
                    <span style={{ fontSize: '34px', lineHeight: 1 }}>{lang.flag}</span>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: '22px', fontWeight: 600, color: '#1E1B4B' }}>
                      {lang.endonym}
                    </span>
                    {selected && <Check size={24} color={PRIMARY} />}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
