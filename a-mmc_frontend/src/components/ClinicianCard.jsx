import { useNavigate } from 'react-router-dom'
import { MapPin, Building2 } from 'lucide-react'

function formatName({ first_name, last_name, suffix }) {
  const base = [first_name, last_name].filter(Boolean).join(' ')
  return suffix ? `${base}, ${suffix}` : base
}

export default function ClinicianCard({ clinician, displayName }) {
  const navigate = useNavigate()

  const {
    clinician_id,
    department,
    specialty,
    room_number,
    profile_picture,
    schedules = [],
  } = clinician

  const fullName    = displayName ?? formatName(clinician)
  const consultTypes = [...new Set(schedules.map(s => s.consultation_type).filter(Boolean))]
  const dicebearUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${clinician_id}`

  function handleCardClick() {
    navigate(`/clinician/${clinician_id}`)
  }

  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleCardClick()}
    >

      {/* ── Title bar — primary bg with avatar, name, specialty ── */}
      <div className="bg-[var(--color-primary)] px-5 pt-6 pb-5 flex flex-col items-center text-center">
        {/* Avatar with white ring border */}
        <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden mb-3 shrink-0 bg-white">
          {profile_picture ? (
            <img
              src={profile_picture}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={dicebearUrl}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <p className="font-bold text-base text-white leading-snug">{fullName}</p>
        <p className="text-sm text-white/70 mt-0.5">{specialty}</p>
      </div>

      {/* ── Card body — white background with details ── */}
      <div className="px-5 py-4 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Building2 size={14} className="shrink-0 text-[var(--color-primary)]" />
            <span>{department}</span>
          </div>
          {room_number && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <MapPin size={14} className="shrink-0 text-[var(--color-primary)]" />
              <span>{room_number}</span>
            </div>
          )}
        </div>

        {consultTypes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {consultTypes.includes('f2f') && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                F2F
              </span>
            )}
            {consultTypes.includes('teleconsult') && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                Teleconsult
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-1">
          <span className="block w-full text-center text-sm font-semibold text-white bg-[var(--color-accent)] px-4 py-2 rounded-lg">
            View Profile
          </span>
        </div>
      </div>

    </div>
  )
}
