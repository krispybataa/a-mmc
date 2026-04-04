import { Link } from 'react-router-dom'
import { MapPin, Building2 } from 'lucide-react'

function formatName({ first_name, middle_name, last_name, suffix }) {
  const mid = middle_name ? `${middle_name[0]}.` : ''
  const base = [first_name, mid, last_name].filter(Boolean).join(' ')
  return suffix ? `${base}, ${suffix}` : base
}

export default function ClinicianCard({ clinician, displayName }) {
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

      {/* ── Avatar area — primary bg, h-48 ── */}
      <div className="relative bg-[var(--color-primary)] h-48 rounded-t-2xl overflow-hidden flex items-center justify-center">
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
            className="w-32 h-32 rounded-full"
          />
        )}

      </div>

      {/* ── Specialty badge ── */}
      <div className="px-5 pt-4 pb-1">
        <span className="inline-block bg-[var(--color-primary)] text-white text-xs font-semibold px-3 py-1 rounded-full">
          {specialty}
        </span>
      </div>

      {/* ── Name ── */}
      <div className="px-5 pb-2">
        <p className="font-semibold text-base text-[var(--color-text)] leading-snug">
          {fullName}
        </p>
      </div>

      {/* ── Details ── */}
      <div className="px-5 pb-5 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Building2 size={14} className="shrink-0 text-gray-400" />
            <span>{department}</span>
          </div>
          {room_number && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <MapPin size={14} className="shrink-0 text-gray-400" />
              <span>{room_number}</span>
            </div>
          )}
        </div>

        {consultTypes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {consultTypes.includes('f2f') && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[var(--color-primary)]">
                F2F
              </span>
            )}
            {consultTypes.includes('teleconsult') && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-[var(--color-primary)]">
                Teleconsult
              </span>
            )}
          </div>
        )}

        <div className="mt-auto">
          <Link
            to={`/clinician/${clinician_id}`}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            View Profile →
          </Link>
        </div>
      </div>

    </div>
  )
}
