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
      className="flex flex-col rounded-2xl shadow-md bg-white text-left transition-colors duration-150 overflow-hidden w-full"
      style={{ minHeight: '280px', cursor: 'pointer' }}
    >
      {/* Top band — photo left, name/specialty right */}
      <div
        className="flex flex-row items-center gap-4 px-5 py-4"
        style={{ backgroundColor: PRIMARY }}
      >
        {/* Profile picture */}
        {clinician.profile_picture ? (
          <img
            src={clinician.profile_picture}
            alt=""
            style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.35)' }}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{ width: '120px', height: '120px', borderRadius: '12px', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{initials || '?'}</span>
          </div>
        )}
        {/* Name + specialty */}
        <div>
          <p className="text-white font-semibold" style={{ fontSize: '24px' }}>
            {name}
          </p>
          <p className="text-blue-200" style={{ fontSize: '18px' }}>
            {clinician.specialty}
          </p>
        </div>
      </div>
      {/* Bottom section */}
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
      .then(res => setClinicians(res.data))
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
      <div
        className="flex items-center px-6 py-4 gap-4 shrink-0"
        style={{ backgroundColor: PRIMARY }}
      >
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
