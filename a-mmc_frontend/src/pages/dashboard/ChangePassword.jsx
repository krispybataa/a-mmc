import { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import api from '../../services/api'

function PasswordField({ id, label, value, onChange, show, onToggle, error }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={[
            'w-full px-3 py-2.5 rounded-lg border text-sm text-[var(--color-dark)] bg-white pr-10',
            'focus:outline-none focus:ring-2 focus:border-transparent min-h-[44px]',
            error
              ? 'border-[var(--color-accent)] focus:ring-[var(--color-accent)]'
              : 'border-slate-200 focus:ring-[var(--color-primary)]',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="text-xs text-[var(--color-accent)] mt-1">{error}</p>}
    </div>
  )
}

export default function ChangePassword() {
  const [current, setCurrent]       = useState('')
  const [next, setNext]             = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors]         = useState({})
  const [saving, setSaving]         = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const successTimerRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(successTimerRef.current)
  }, [])

  function validate() {
    const errs = {}
    if (!current)          errs.current = 'Current password is required.'
    if (!next)             errs.next    = 'New password is required.'
    else if (next.length < 8) errs.next = 'New password must be at least 8 characters.'
    if (!confirm)          errs.confirm = 'Please confirm your new password.'
    else if (next && confirm && next !== confirm)
                           errs.confirm = 'Passwords do not match.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setSaving(true)

    try {
      await api.patch('/auth/change-password', {
        current_password: current,
        new_password:     next,
      })
      setCurrent('')
      setNext('')
      setConfirm('')
      setSuccessMsg('Password updated successfully.')
      clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      if (err.response?.status === 401) {
        setErrors({ current: 'Current password is incorrect.' })
      } else {
        setErrors({ form: err.response?.data?.error ?? 'Something went wrong. Please try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-[var(--color-dark)]">Change Password</h1>
        <p className="text-sm text-slate-500 mt-1">Update your login password.</p>
      </div>

      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <PasswordField
            id="current"
            label="Current Password"
            value={current}
            onChange={v => { setCurrent(v); if (errors.current) setErrors(e => ({ ...e, current: undefined })) }}
            show={showCurrent}
            onToggle={() => setShowCurrent(v => !v)}
            error={errors.current}
          />

          <PasswordField
            id="next"
            label="New Password"
            value={next}
            onChange={v => { setNext(v); if (errors.next) setErrors(e => ({ ...e, next: undefined })) }}
            show={showNext}
            onToggle={() => setShowNext(v => !v)}
            error={errors.next}
          />

          <PasswordField
            id="confirm"
            label="Confirm New Password"
            value={confirm}
            onChange={v => { setConfirm(v); if (errors.confirm) setErrors(e => ({ ...e, confirm: undefined })) }}
            show={showConfirm}
            onToggle={() => setShowConfirm(v => !v)}
            error={errors.confirm}
          />

          {errors.form && (
            <p className="text-sm text-[var(--color-accent)]">{errors.form}</p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
