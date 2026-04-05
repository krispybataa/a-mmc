import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, DoorOpen, ShieldCheck, Building2, Video } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import ClinicianCard from '../../components/ClinicianCard'

// ── helpers ──────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ABBREV = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
}

function formatTime(timeStr) {
  if (!timeStr) return null
  const [hourStr, minStr] = timeStr.split(':')
  let hour = parseInt(hourStr, 10)
  const min = minStr || '00'
  const period = hour >= 12 ? 'PM' : 'AM'
  if (hour === 0) hour = 12
  else if (hour > 12) hour = hour - 12
  return `${hour}:${min} ${period}`
}

function isValidSlot(start, end) {
  if (!start || !end) return false
  const toMins = t => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  return toMins(end) > toMins(start)
}

function buildScheduleRows(schedule) {
  const byDay = Object.fromEntries(schedule.map((s) => [s.day_of_week, s]))
  return WEEK_DAYS.map((day) => {
    const s = byDay[day]
    const showAM = s && isValidSlot(s.am_start, s.am_end)
    const showPM = s && isValidSlot(s.pm_start, s.pm_end)
    return {
      day,
      abbrev: DAY_ABBREV[day],
      am: showAM ? `${formatTime(s.am_start)} – ${formatTime(s.am_end)}` : '—',
      pm: showPM ? `${formatTime(s.pm_start)} – ${formatTime(s.pm_end)}` : '—',
      active: !!s,
    }
  })
}

function formatName({ first_name, last_name, suffix }) {
  const base = [first_name, last_name].filter(Boolean).join(' ')
  return suffix ? `${base}, ${suffix}` : base
}


function ScheduleTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2.5 pr-6 w-16">
              Day
            </th>
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2.5 pr-6">
              Morning
            </th>
            <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2.5">
              Afternoon
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ day, abbrev, am, pm, active }) => (
            <tr
              key={day}
              className={`border-b border-slate-50 last:border-0 ${active ? '' : 'opacity-35'}`}
            >
              <td className="py-2.5 pr-6 font-semibold text-[var(--color-dark)] text-xs">
                {abbrev}
              </td>
              <td className="py-2.5 pr-6 text-slate-600">{am}</td>
              <td className="py-2.5 text-slate-600">{pm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ClinicianProfile() {
  const { id: clinician_id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [clinician, setClinician]       = useState(null)
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const [fetchError, setFetchError]     = useState('')
  const [similar, setSimilar]           = useState([])
  const [similarLoading, setSimilarLoading] = useState(false)

  // Scroll to top whenever the profile changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [clinician_id])

  // Main clinician fetch
  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/clinicians/${clinician_id}`)
        setClinician(data)
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true)
        } else {
          setFetchError('Unable to load clinician profile. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clinician_id])

  // Similar doctors fetch — runs once specialty is known, silently hides on error
  useEffect(() => {
    if (!clinician?.specialty) return
    setSimilarLoading(true)
    setSimilar([])
    api.get('/clinicians/')
      .then(res => {
        const filtered = res.data.filter(
          c => c.specialty === clinician.specialty &&
               c.clinician_id !== Number(clinician_id)
        )
        setSimilar(filtered)
      })
      .catch(() => {})
      .finally(() => setSimilarLoading(false))
  }, [clinician?.specialty, clinician_id])

  function handleBook() {
    if (user) {
      navigate(`/book/${clinician_id}`)
    } else {
      navigate(`/login?redirect=/clinician/${clinician_id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-slate-500 text-base font-medium">Clinician not found.</p>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft size={13} />
          Back to Directory
        </Link>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-[var(--color-accent)] text-sm font-medium">{fetchError}</p>
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft size={13} />
          Back to Directory
        </Link>
      </div>
    )
  }

  const {
    department,
    specialty,
    room_number,
    local_number,
    profile_picture,
    schedules,
    hmos,
    infos = [],
  } = clinician

  const fullName = formatName(clinician)

  const f2fSchedules         = schedules.filter((s) => s.consultation_type === 'f2f' || !s.consultation_type)
  const teleconsultSchedules = schedules.filter((s) => s.consultation_type === 'teleconsult')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back link */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <Link
          to="/doctors"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Directory
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* ── LEFT: identity + CTA ── */}
        <aside className="md:col-span-1 flex flex-col gap-4">

          {/* Profile card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
            {profile_picture ? (
              <img
                src={profile_picture}
                alt={fullName}
                className="w-48 h-48 rounded-2xl object-cover mb-4"
              />
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/personas/svg?seed=${clinician.clinician_id}`}
                alt={fullName}
                className="w-48 h-48 rounded-2xl mb-4"
              />
            )}

            <h1 className="text-base font-bold text-[var(--color-dark)] leading-snug">
              {fullName}
            </h1>
            <p className="text-[var(--color-primary)] font-medium text-sm mt-1">{specialty}</p>
            {specialty !== department && (
              <p className="text-slate-400 text-xs mt-0.5">{department}</p>
            )}

            <div className="mt-5 w-full space-y-2.5 text-sm text-slate-600 text-left border-t border-slate-100 pt-4">
              <div className="flex items-start gap-2.5">
                <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{room_number}</span>
              </div>
              {local_number && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <DoorOpen className="w-4 h-4 flex-shrink-0" />
                  <span>Local {local_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* CTA card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <button
              onClick={handleBook}
              className="w-full py-3 px-6 rounded-lg text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 transition-opacity duration-150"
            >
              Book an Appointment
            </button>
            {!user && (
              <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed">
                You must be logged in to book an appointment.
              </p>
            )}
          </div>
        </aside>

        {/* ── RIGHT: schedule + HMOs + info ── */}
        <div className="md:col-span-2 flex flex-col gap-5">

          {/* Clinic Schedule (F2F) */}
          {f2fSchedules.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="section-heading flex items-center gap-2 text-sm mb-5">
                <Building2 size={15} className="shrink-0" />
                Clinic Schedule
              </h2>
              <ScheduleTable rows={buildScheduleRows(f2fSchedules)} />
            </section>
          )}

          {/* Teleconsultation Schedule */}
          {teleconsultSchedules.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="section-heading flex items-center gap-2 text-sm mb-5">
                <Video size={15} className="shrink-0" />
                Teleconsultation Schedule
              </h2>
              <ScheduleTable rows={buildScheduleRows(teleconsultSchedules)} />
            </section>
          )}

          {/* Subject-to-change note */}
          {(f2fSchedules.length > 0 || teleconsultSchedules.length > 0) && (
            <p className="text-xs text-slate-400 leading-relaxed px-1">
              Schedule is subject to change. Please contact the clinic for the most up-to-date information.
            </p>
          )}

          {/* HMOs */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="section-heading flex items-center gap-2 text-xs mb-4">
              <ShieldCheck size={13} />
              HMO Accreditations
            </h2>
            {hmos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hmos.map((hmo) => (
                  <span
                    key={hmo.hmo_id}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-[var(--color-primary)] border border-blue-100"
                  >
                    {hmo.hmo_name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No HMO information available.</p>
            )}
          </section>

          {/* Clinician info (background, awards, etc.) */}
          {infos.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
              {infos.map((entry, i) => (
                <div key={entry.info_id} className={i > 0 ? 'pt-5 border-t border-slate-100' : ''}>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {entry.label}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{entry.content}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {/* ── Similar Doctors ── */}
      {(similarLoading || similar.length > 0) && (
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[var(--color-dark)]">Similar Doctors</h2>
            <p className="text-sm text-slate-400 mt-0.5">Other clinicians in {specialty}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {similarLoading
              ? [1, 2, 3].map(i => (
                  <div key={i} className="w-full h-48 rounded-2xl animate-pulse bg-gray-100" />
                ))
              : similar.map(c => (
                  <ClinicianCard key={c.clinician_id} clinician={c} />
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
