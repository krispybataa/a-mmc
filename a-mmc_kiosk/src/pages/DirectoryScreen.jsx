import { useEffect, useState } from 'react'
import api from '../services/api'
import KioskClock from '../components/KioskClock'

const PRIMARY = '#1D409C'
const ACCENT  = '#CE1117'

function ClinicianKioskCard({ clinician, onSelect }) {
  const name     = [clinician.first_name, clinician.last_name].filter(Boolean).join(' ')
  const initials = [clinician.first_name?.[0], clinician.last_name?.[0]].filter(Boolean).join('').toUpperCase()

  return (
    <button
      onClick={() => onSelect(clinician)}
      className="flex flex-col rounded-2xl shadow-md bg-white text-left transition-all duration-150 overflow-hidden w-full hover:shadow-lg"
      style={{ minHeight: '280px', cursor: 'pointer' }}
    >
      {/* Title bar — gradient, centered avatar + name + specialty */}
      <div className="navbar-gradient flex flex-col items-center text-center px-5 pt-6 pb-5">
        {clinician.profile_picture ? (
          <img
            src={clinician.profile_picture}
            alt=""
            className="rounded-full object-cover border-4 border-white mb-3 shrink-0"
            style={{ width: '88px', height: '88px' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div
            className="rounded-full border-4 border-white flex items-center justify-center mb-3 shrink-0"
            style={{ width: '88px', height: '88px', backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#fff' }}>{initials || '?'}</span>
          </div>
        )}
        <p className="font-bold text-white leading-snug" style={{ fontSize: '20px' }}>
          {name}
        </p>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>
          {clinician.specialty}
        </p>
      </div>
      {/* Card body */}
      <div className="flex flex-col justify-between flex-1 px-6 py-5 gap-2">
        <div>
          <p className="text-gray-700" style={{ fontSize: '18px' }}>
            {clinician.department}
          </p>
          {clinician.room_number && (
            <p className="text-gray-500" style={{ fontSize: '18px' }}>
              {clinician.room_number}
            </p>
          )}
        </div>
        <p className="font-semibold" style={{ fontSize: '20px', color: ACCENT }}>
          View Profile →
        </p>
      </div>
    </button>
  )
}

export default function DirectoryScreen({ onNavigate, onSelectClinician }) {
  const [clinicians,        setClinicians]        = useState([])
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState('All')

  function fetchClinicians() {
    setLoading(true)
    setError(null)
    api.get('/clinicians/')
      .then(res => setClinicians(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError('Could not load clinicians. Please try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchClinicians()
  }, [])

  const specialties = ['All', ...Array.from(new Set(clinicians.map(c => c.specialty).filter(Boolean)))]

  const filtered = selectedSpecialty === 'All'
    ? clinicians
    : clinicians.filter(c => c.specialty === selectedSpecialty)

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="navbar-gradient flex items-center px-6 py-4 gap-4 shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center justify-center rounded-xl bg-white font-bold transition-colors duration-150 hover:bg-blue-50 shrink-0"
          style={{ fontSize: '24px', color: PRIMARY, minWidth: '72px', minHeight: '72px' }}
        >
          ←
        </button>
        <h2 className="text-white font-bold flex-1 text-center" style={{ fontSize: '28px' }}>
          Clinician Directory
        </h2>
        <KioskClock />
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500" style={{ fontSize: '22px' }}>Loading clinicians…</p>
        </div>
      )}

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-gray-600" style={{ fontSize: '22px' }}>{error}</p>
          <button
            onClick={fetchClinicians}
            className="rounded-2xl px-10 font-semibold text-white transition-colors duration-150"
            style={{ backgroundColor: PRIMARY, fontSize: '22px', minHeight: '72px' }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Specialty filter pills */}
          <div className="flex gap-3 px-6 py-4 overflow-x-auto shrink-0">
            {specialties.map(spec => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className="rounded-full border-2 font-medium whitespace-nowrap transition-colors duration-150 px-6"
                style={{
                  minHeight: '64px',
                  fontSize: '20px',
                  backgroundColor: selectedSpecialty === spec ? PRIMARY : '#fff',
                  color: selectedSpecialty === spec ? '#fff' : PRIMARY,
                  borderColor: PRIMARY,
                }}
              >
                {spec}
              </button>
            ))}
          </div>

          {/* Clinician grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-gray-400" style={{ fontSize: '22px' }}>
                  No clinicians found for this specialty.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {filtered.map(c => (
                  <ClinicianKioskCard
                    key={c.clinician_id}
                    clinician={c}
                    onSelect={onSelectClinician}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
