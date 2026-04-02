import { useEffect, useState } from 'react'
import api from '../services/api'
import QRDisplay from '../components/QRDisplay'

const PRIMARY = '#1D409C'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

function buildScheduleLines(schedules) {
  const byDay = {}
  for (const s of schedules) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = { am: null, pm: null }
    if (s.am_start && s.am_end) {
      byDay[s.day_of_week].am = `${formatTime12(s.am_start)} – ${formatTime12(s.am_end)}`
    }
    if (s.pm_start && s.pm_end) {
      byDay[s.day_of_week].pm = `${formatTime12(s.pm_start)} – ${formatTime12(s.pm_end)}`
    }
  }
  return DAY_ORDER
    .filter(d => byDay[d])
    .map(d => {
      const slots = [byDay[d].am, byDay[d].pm].filter(Boolean).join(', ')
      return `${d}: ${slots}`
    })
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

  const f2fSchedules = (data.schedules || []).filter(s => s.consultation_type === 'f2f')
  const teleSchedules = (data.schedules || []).filter(s => s.consultation_type === 'teleconsult')
  const f2fLines = buildScheduleLines(f2fSchedules)
  const teleLines = buildScheduleLines(teleSchedules)

  const hmos = data.hmos || []
  const infos = (data.infos || []).filter(i => i.label === 'background')

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center px-6 py-4 shrink-0"
        style={{ backgroundColor: PRIMARY }}
      >
        <h2 className="text-white font-bold flex-1 text-center" style={{ fontSize: '28px' }}>
          Doctor Profile
        </h2>
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
            <div>
              <p className="font-bold" style={{ fontSize: '30px', color: PRIMARY }}>
                {data.title} {data.first_name} {data.middle_name ? `${data.middle_name} ` : ''}{data.last_name}{data.suffix ? `, ${data.suffix}` : ''}
              </p>
              <p className="text-gray-600 mt-1" style={{ fontSize: '22px' }}>{data.specialty}</p>
              <p className="text-gray-500" style={{ fontSize: '20px' }}>{data.department}</p>
              {data.room_number && (
                <p className="text-gray-500" style={{ fontSize: '20px' }}>
                  📍 {data.room_number}
                </p>
              )}
            </div>

            {hmos.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '18px' }}>
                  HMO Accreditations
                </p>
                <div className="flex flex-wrap gap-2">
                  {hmos.map(h => (
                    <span
                      key={h.hmo_id}
                      className="rounded-full border px-4 py-1 text-gray-700"
                      style={{ fontSize: '16px', borderColor: PRIMARY }}
                    >
                      {h.hmo_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                  fontSize: '22px',
                  minHeight: '72px',
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
            <div>
              <p className="font-bold text-gray-800 mb-4" style={{ fontSize: '24px' }}>
                Book this Doctor
              </p>
              <QRDisplay clinicianId={data.clinician_id} size={240} />
              <p className="text-gray-600 mt-5 max-w-sm" style={{ fontSize: '20px' }}>
                Scan the QR code with your phone's camera to view this doctor's profile
                and book an appointment.
              </p>
            </div>

            {(f2fLines.length > 0 || teleLines.length > 0) && (
              <div className="flex flex-col gap-5">
                {f2fLines.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '20px' }}>
                      Clinic Schedule
                    </p>
                    <ul className="flex flex-col gap-1">
                      {f2fLines.map(line => (
                        <li key={line} className="text-gray-600" style={{ fontSize: '18px' }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {teleLines.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-700 mb-2" style={{ fontSize: '20px' }}>
                      Teleconsultation Schedule
                    </p>
                    <ul className="flex flex-col gap-1">
                      {teleLines.map(line => (
                        <li key={line} className="text-gray-600" style={{ fontSize: '18px' }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
