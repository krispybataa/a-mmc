import { useCallback, useState } from 'react'
import IdleTimer from './components/IdleTimer'
import HomeScreen from './pages/HomeScreen'
import DirectoryScreen from './pages/DirectoryScreen'
import ClinicianDetailScreen from './pages/ClinicianDetailScreen'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [selectedClinician, setSelectedClinician] = useState(null)

  const handleNavigate = useCallback((target) => {
    setScreen(target)
  }, [])

  const handleSelectClinician = useCallback((clinician) => {
    setSelectedClinician(clinician)
    setScreen('clinician')
  }, [])

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
          onBack={() => setScreen('directory')}
        />
      )}
    </>
  )
}
