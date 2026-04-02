import { QRCodeSVG } from 'qrcode.react'

const MAIN_APP_URL = import.meta.env.VITE_MAIN_APP_URL || 'http://localhost'

export default function QRDisplay({ clinicianId, size = 180 }) {
  const url = `${MAIN_APP_URL}/clinician/${clinicianId}`

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG value={url} size={size} />
      <p className="text-gray-500" style={{ fontSize: '16px' }}>
        Scan to book on your phone
      </p>
    </div>
  )
}
