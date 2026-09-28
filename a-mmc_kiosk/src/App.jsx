import { useCallback, useState } from 'react'
import IdleTimer from './components/IdleTimer'
import HomeScreen from './pages/HomeScreen'
import DirectoryScreen from './pages/DirectoryScreen'
import ClinicianDetailScreen from './pages/ClinicianDetailScreen'
import KioskTriageScreen from './pages/KioskTriageScreen'
import { DEFAULT_LANG } from './data/homeStrings'

export default function App() {
  const [screen,             setScreen]             = useState('home')
  const [selectedClinician,  setSelectedClinician]  = useState(null)
  const [fromScreen,         setFromScreen]         = useState('directory')
  // Home-screen language selection (F-KIOSKLANG-1). Session-only, kiosk-scoped,
  // no persistence -- resets to default on the idle-timeout return-to-home.
  const [lang,               setLang]               = useState(DEFAULT_LANG)
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
    setLang(DEFAULT_LANG)
  }, [])

  return (
    <>
      <IdleTimer timeoutMs={120000} onIdle={handleIdle} />

      {screen === 'home' && (
        <HomeScreen onNavigate={handleNavigate} lang={lang} onLangChange={setLang} />
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
