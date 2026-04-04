import { useState, useEffect } from 'react'

export default function KioskClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  return (
    <div className="text-right">
      <div className="text-2xl font-bold text-white">{timeStr}</div>
      <div className="text-sm text-white/80">{dateStr}</div>
    </div>
  )
}
