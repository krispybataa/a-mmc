import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

// ---------------------------------------------------------------------------
// Resolves which clinician_id the current staff user is acting as.
//
// - role === 'clinician': always their own id, no selection needed.
// - role === 'secretary' with exactly one linked clinician: auto-selected
//   silently, no UI shown.
// - role === 'secretary' with multiple linked clinicians: clinicianOptions
//   is populated (id + display name) so a switcher can be rendered; the
//   secretary's selection is kept in memory only (not persisted across
//   reloads), matching how the access token itself is handled.
// ---------------------------------------------------------------------------

const ActingClinicianContext = createContext(null)

export function ActingClinicianProvider({ children }) {
  const { user } = useAuth()
  const [clinicianId, setClinicianId] = useState(null)
  const [clinicianOptions, setClinicianOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setClinicianId(null)
    setClinicianOptions([])
    setError('')

    if (!user) return

    if (user.role === 'clinician') {
      setClinicianId(user.id)
      return
    }

    if (user.role !== 'secretary') return

    let cancelled = false
    setLoading(true)
    api.get(`/secretaries/${user.id}`)
      .then(({ data }) => {
        const ids = data.clinician_ids ?? []
        if (cancelled) return
        if (ids.length === 0) {
          setError('No clinician is linked to your account.')
          return
        }
        if (ids.length === 1) {
          setClinicianId(ids[0])
          return
        }
        return Promise.all(
          ids.map(id =>
            api.get(`/clinicians/${id}`)
              .then(({ data: c }) => ({
                clinician_id: id,
                name: [c.title, c.first_name, c.last_name].filter(Boolean).join(' '),
              }))
              .catch(() => ({ clinician_id: id, name: `Clinician #${id}` }))
          )
        ).then(options => {
          if (cancelled) return
          setClinicianOptions(options)
          setClinicianId(options[0].clinician_id)
        })
      })
      .catch(() => {
        if (!cancelled) setError('Unable to resolve your linked clinician.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id, user?.role])

  return (
    <ActingClinicianContext.Provider
      value={{ clinicianId, setClinicianId, clinicianOptions, loading, error }}
    >
      {children}
    </ActingClinicianContext.Provider>
  )
}

export function useActingClinician() {
  return useContext(ActingClinicianContext)
}
