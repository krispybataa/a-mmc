const PRIMARY = '#1D409C'

function ModeButton({ icon, label, subtext, onClick, disabled, badge }) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white border-4 transition-colors duration-150 p-10 w-64"
        style={{
          minWidth: '200px',
          minHeight: '200px',
          borderColor: PRIMARY,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = PRIMARY
            e.currentTarget.style.color = '#fff'
          }
        }}
        onMouseLeave={e => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = '#fff'
            e.currentTarget.style.color = ''
          }
        }}
      >
        <span style={{ fontSize: '64px', lineHeight: 1 }}>{icon}</span>
        <span className="font-bold text-center" style={{ fontSize: '24px' }}>
          {label}
        </span>
        <span className="text-center text-gray-500" style={{ fontSize: '16px' }}>
          {subtext}
        </span>
      </button>
      {badge && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(100,100,100,0.55)' }}
        >
          <span
            className="bg-gray-700 text-white font-semibold rounded-full px-5 py-2"
            style={{ fontSize: '18px' }}
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div
        className="flex items-center justify-center py-6 px-8"
        style={{ backgroundColor: PRIMARY }}
      >
        <h1 className="text-white font-bold tracking-wide" style={{ fontSize: '36px' }}>
          Asclepius
        </h1>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center" style={{ gap: '48px' }}>
        <ModeButton
          icon="🩺"
          label="Find a Doctor"
          subtext="Browse our list of clinicians"
          onClick={() => onNavigate('directory')}
        />
        <ModeButton
          icon="📋"
          label="Find the Right Doctor for You"
          subtext="Answer a few questions to get matched"
          onClick={() => {}}
          disabled
          badge="Coming Soon"
        />
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center pb-8 gap-1">
        <p className="text-gray-400 font-medium" style={{ fontSize: '18px' }}>
          Touch the screen to get started
        </p>
        <p className="text-gray-400" style={{ fontSize: '16px' }}>
          This station will reset after 2 minutes of inactivity
        </p>
      </div>
    </div>
  )
}
