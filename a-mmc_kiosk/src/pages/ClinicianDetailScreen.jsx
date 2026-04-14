import { useEffect, useState } from 'react'
import api from '../services/api'
import QRDisplay from '../components/QRDisplay'
import KioskClock from '../components/KioskClock'

const PRIMARY = '#1D409C'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hr}:${String(m).padStart(2, '0')} ${period}`
}

function isValidSlot(start, end) {
  if (!start || !end) return false
  const toMins = t => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  return toMins(end) > toMins(start)
}

function buildScheduleTable(schedules) {
  const byDay = {}
  for (const s of schedules) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = { morning: null, afternoon: null }
    if (isValidSlot(s.am_start, s.am_end)) {
      byDay[s.day_of_week].morning = `${formatTime(s.am_start)} – ${formatTime(s.am_end)}`
    }
    if (isValidSlot(s.pm_start, s.pm_end)) {
      byDay[s.day_of_week].afternoon = `${formatTime(s.pm_start)} – ${formatTime(s.pm_end)}`
    }
  }
  return DAY_ORDER
    .filter(d => byDay[d])
    .map(d => ({ day: d, morning: byDay[d].morning, afternoon: byDay[d].afternoon }))
}

function ScheduleTable({ rows, label }) {
  if (!rows.length) return null
  return (
    <div>
      <p style={{ fontSize: '22px', fontWeight: '700', color: PRIMARY, marginBottom: '12px' }}>
        {label}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ fontSize: '20px', color: PRIMARY, fontWeight: '600', textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e5e7eb' }}>Day</th>
            <th style={{ fontSize: '20px', color: PRIMARY, fontWeight: '600', textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e5e7eb' }}>Morning</th>
            <th style={{ fontSize: '20px', color: PRIMARY, fontWeight: '600', textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid #e5e7eb' }}>Afternoon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.day} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
              <td style={{ fontSize: '22px', fontWeight: '600', padding: '16px 8px' }}>{row.day}</td>
              <td style={{ fontSize: '20px', padding: '16px 8px', color: '#374151' }}>{row.morning || '—'}</td>
              <td style={{ fontSize: '20px', padding: '16px 8px', color: '#374151' }}>{row.afternoon || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ClinicianDetailScreen({ clinician: stub, onBack }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/clinicians/${stub.clinician_id}`)
      .then(res => setProfile(res.data))
      .catch(() => setProfile(stub))
      .finally(() => setLoading(false))
  }, [stub.clinician_id])

  const data = profile || stub

  const f2fSchedules  = (data.schedules || []).filter(s => s.consultation_type === 'f2f')
  const teleSchedules = (data.schedules || []).filter(s => s.consultation_type === 'teleconsult')
  const f2fRows  = buildScheduleTable(f2fSchedules)
  const teleRows = buildScheduleTable(teleSchedules)

  const hmos  = data.hmos || []
  const infos = (data.infos || []).filter(i => i.label === 'background')

  const fullName = [
    data.first_name,
    data.middle_name ? `${data.middle_name}` : null,
    data.last_name,
  ].filter(Boolean).join(' ') + (data.suffix ? `, ${data.suffix}` : '')

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="navbar-gradient flex items-center px-6 py-4 shrink-0">
        <div style={{ minWidth: '120px' }} />
        <h2 className="text-white font-bold flex-1 text-center" style={{ fontSize: '28px' }}>
          Doctor Profile
        </h2>
        <KioskClock />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500" style={{ fontSize: '22px' }}>Loading…</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left column — 40% */}
          <div
            className="flex flex-col overflow-y-auto px-8 py-6 gap-5"
            style={{ width: '40%', borderRight: '1px solid #e5e7eb' }}
          >
            {/* Profile picture */}
            {(() => {
              const initials = [data.first_name?.[0], data.last_name?.[0]].filter(Boolean).join('').toUpperCase()
              return data.profile_picture ? (
                <img
                  src={data.profile_picture}
                  alt=""
                  style={{ width: '180px', height: '180px', borderRadius: '16px', objectFit: 'cover', border: `3px solid ${PRIMARY}` }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div style={{ width: '180px', height: '180px', borderRadius: '16px', backgroundColor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: '40px', fontWeight: '700' }}>{initials || '?'}</span>
                </div>
              )
            })()}

            {/* Name + specialty + location */}
            <div>
              <p className="font-bold" style={{ fontSize: '30px', color: PRIMARY }}>
                {fullName}
              </p>
              <p className="text-gray-600 mt-1" style={{ fontSize: '22px' }}>{data.specialty}</p>
              <p className="text-gray-500" style={{ fontSize: '20px' }}>{data.department}</p>
              {data.room_number && (
                <p className="text-gray-500" style={{ fontSize: '20px' }}>
                  📍 {data.room_number}
                </p>
              )}
            </div>

            {/* HMO accreditations — direct display */}
            <div>
              <p style={{ fontSize: '22px', fontWeight: '700', color: PRIMARY, marginBottom: '12px' }}>
                HMO Accreditations
              </p>
              {hmos.length === 0 ? (
                <p className="text-gray-400 text-lg">No HMO accreditations listed.</p>
              ) : (
                <div className="flex flex-wrap gap-3 mt-3">
                  {hmos.map(h => (
                    <span
                      key={h.hmo_id}
                      className="rounded-full font-medium"
                      style={{
                        backgroundColor: 'rgba(29,64,156,0.1)',
                        color: PRIMARY,
                        border: '1px solid rgba(29,64,156,0.2)',
                        padding: '8px 16px',
                        fontSize: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: '48px',
                      }}
                    >
                      {h.hmo_name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Background info */}
            {infos.map(info => (
              <div key={info.info_id}>
                <p className="font-semibold text-gray-700 mb-1 capitalize" style={{ fontSize: '18px' }}>
                  {info.label}
                </p>
                <p className="text-gray-600" style={{ fontSize: '18px' }}>{info.content}</p>
              </div>
            ))}

            {/* Back button */}
            <div className="mt-auto pt-4">
              <button
                onClick={onBack}
                className="w-full rounded-2xl font-bold text-white transition-colors duration-150"
                style={{
                  backgroundColor: PRIMARY,
                  fontSize: '24px',
                  minHeight: '80px',
                }}
              >
                ← Back to Directory
              </button>
            </div>
          </div>

          {/* Right column — 60% */}
          <div
            className="flex flex-col overflow-y-auto px-8 py-6 gap-6"
            style={{ width: '60%' }}
          >
            {/* QR code */}
            <div>
              <p className="font-bold text-gray-800 mb-4" style={{ fontSize: '24px' }}>
                Book this Doctor
              </p>
              <QRDisplay clinicianId={data.clinician_id} size={280} />
              <p className="text-gray-600 mt-5 max-w-sm" style={{ fontSize: '20px' }}>
                Scan the QR code with your phone's camera to view this doctor's profile
                and book an appointment.
              </p>
            </div>

            {/* Schedule tables */}
            {(f2fRows.length > 0 || teleRows.length > 0) && (
              <div className="flex flex-col gap-6">
                <ScheduleTable rows={f2fRows}  label="Clinic Schedule" />
                <ScheduleTable rows={teleRows} label="Teleconsultation Schedule" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
