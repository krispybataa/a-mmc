import { Link } from 'react-router-dom'
import { MapPin, CalendarDays, ShieldCheck } from 'lucide-react'

const DAY_ABBREV = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

function formatName({ title, first_name, middle_name, last_name, suffix }) {
  const mid = middle_name ? `${middle_name[0]}.` : ''
  const base = [title, first_name, mid, last_name].filter(Boolean).join(' ')
  return suffix ? `${base}, ${suffix}` : base
}

function getInitials(first_name, last_name) {
  return `${first_name[0]}${last_name[0]}`.toUpperCase()
}

export default function ClinicianCard({ clinician }) {
  const {
    clinician_id,
    first_name,
    last_name,
    department,
    specialty,
    room_number,
    profile_picture,
    schedules,
    hmos,
  } = clinician

  const fullName    = formatName(clinician)
  const initials    = getInitials(first_name, last_name)
  const scheduleDays = schedules.map((s) => DAY_ABBREV[s.day_of_week]).join(', ')
  const hmoCount    = hmos.length

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden">

      {/* ── Full-width image / initials avatar ── */}
      {profile_picture ? (
        <img
          src={profile_picture}
          alt={fullName}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square bg-[var(--color-primary)] flex items-center justify-center select-none">
          <span className="text-white font-bold text-5xl">{initials}</span>
        </div>
      )}

      {/* ── Name & specialty ── */}
      <div className="px-5 pt-4 pb-3">
        <h3 className="font-semibold text-[var(--color-dark)] text-[0.95rem] leading-snug">
          {fullName}
        </h3>
        <p className="text-[var(--color-primary)] text-sm font-medium mt-0.5 truncate">
          {specialty}
        </p>
        {specialty !== department && (
          <p className="text-slate-400 text-xs mt-0.5 truncate">{department}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 mx-5" />

      {/* ── Details ── */}
      <div className="p-5 flex-1 space-y-2.5">
        <div className="flex items-start gap-2.5 text-sm text-slate-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{room_number}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm text-slate-600">
          <CalendarDays size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{scheduleDays}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[var(--color-primary)]">
            {hmoCount} HMO{hmoCount !== 1 ? 's' : ''} accepted
          </span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 pb-5">
        <Link
          to={`/clinician/${clinician_id}`}
          className="block w-full text-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity duration-150"
        >
          View Profile
        </Link>
      </div>

    </div>
  )
}
