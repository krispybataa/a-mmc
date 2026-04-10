import { useCallback, useState } from 'react'
import IdleTimer from './components/IdleTimer'
import HomeScreen from './pages/HomeScreen'
import DirectoryScreen from './pages/DirectoryScreen'
import ClinicianDetailScreen from './pages/ClinicianDetailScreen'
import KioskTriageScreen from './pages/KioskTriageScreen'

export default function App() {
  const [screen,             setScreen]             = useState('home')
  const [selectedClinician,  setSelectedClinician]  = useState(null)
  const [fromScreen,         setFromScreen]         = useState('directory')
  console.log('API URL:', import.meta.env.VITE_API_URL)
  const handleNavigate = useCallback((target) => {
    setScreen(target)
  }, [])

  const handleSelectClinician = useCallback((clinician) => {
    setFromScreen(screen)          // remember where we came from
    setSelectedClinician(clinician)
    setScreen('clinician')
  }, [screen])

  const handleIdle = useCallback(() => {
    setScreen('home')
    setSelectedClinician(null)
  }, [])

  return (
    <>
      <IdleTimer timeoutMs={120000} onIdle={handleIdle} />

      {screen === 'home' && (
        <HomeScreen onNavigate={handleNavigate} />
      )}

      {screen === 'directory' && (
        <DirectoryScreen
          onNavigate={handleNavigate}
          onSelectClinician={handleSelectClinician}
        />
      )}

      {screen === 'clinician' && selectedClinician && (
        <ClinicianDetailScreen
          clinician={selectedClinician}
          onBack={() => setScreen(fromScreen)}
        />
      )}

      {screen === 'triage' && (
        <KioskTriageScreen
          onNavigate={handleNavigate}
          onSelectClinician={handleSelectClinician}
        />
      )}
    </>
  )
}
