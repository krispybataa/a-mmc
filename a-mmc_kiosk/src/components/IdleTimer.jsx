import { useEffect } from 'react'

const RESET_EVENTS = ['mousemove', 'mousedown', 'touchstart', 'keydown']

export default function IdleTimer({ timeoutMs = 120000, onIdle }) {
  useEffect(() => {
    let timer = null

    function resetTimer() {
      clearTimeout(timer)
      timer = setTimeout(onIdle, timeoutMs)
    }

    RESET_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timer)
      RESET_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer))
    }
  }, [timeoutMs, onIdle])

  return null
}
