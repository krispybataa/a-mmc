import KioskClock from '../components/KioskClock'

const PRIMARY = '#1D409C'
const ACCENT  = '#CE1117'

function ModeButton({ icon, label, subtext, onClick, disabled, badge, borderColor }) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          borderRadius: '16px',
          backgroundColor: '#fff',
          border: `4px solid ${borderColor}`,
          minWidth: '240px',
          minHeight: '240px',
          padding: '40px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = borderColor
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }}
        onMouseLeave={e => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = '#fff'
            e.currentTarget.style.color = ''
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
            e.currentTarget.style.transform = ''
          }
        }}
      >
        <span style={{ fontSize: '64px', lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: '24px', fontWeight: '700', textAlign: 'center' }}>
          {label}
        </span>
        <span style={{ fontSize: '20px', color: '#6B7280', textAlign: 'center' }}>
          {subtext}
        </span>
      </button>
      {badge && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            backgroundColor: 'rgba(100,100,100,0.55)',
          }}
        >
          <span
            style={{
              backgroundColor: '#374151',
              color: '#fff',
              fontWeight: '600',
              borderRadius: '9999px',
              padding: '8px 20px',
              fontSize: '20px',
            }}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  )
}

export default function HomeScreen({ onNavigate }) {
  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#F8F7FF' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between py-5 px-8 shrink-0"
        style={{ backgroundColor: PRIMARY }}
      >
        <h1 className="text-white font-bold tracking-wide" style={{ fontSize: '36px' }}>
          Unicorn
        </h1>
        <KioskClock />
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center" style={{ gap: '64px' }}>
        <ModeButton
          icon="🩺"
          label="Find a Doctor"
          subtext="Browse our list of clinicians"
          onClick={() => onNavigate('directory')}
          borderColor={PRIMARY}
        />
        <ModeButton
          icon="📋"
          label="Find the Right Doctor for You"
          subtext="Answer a few questions to get matched"
          onClick={() => onNavigate('triage')}
          borderColor={ACCENT}
        />
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center pb-8 gap-1 shrink-0">
        <p style={{ fontSize: '20px', color: '#6B7280', fontWeight: '500' }}>
          Touch the screen to get started
        </p>
        <p style={{ fontSize: '18px', color: '#9CA3AF' }}>
          This station will reset after 2 minutes of inactivity
        </p>
      </div>
    </div>
  )
}
