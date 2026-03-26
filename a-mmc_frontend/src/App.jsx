import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/public/Home'
import ClinicianProfile from './pages/public/ClinicianProfile'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import BookAppointment from './pages/public/BookAppointment'
import PatientDashboard from './pages/dashboard/PatientDashboard'
import PatientAppointments from './pages/dashboard/PatientAppointments'
import ClinicianDashboard from './pages/dashboard/ClinicianDashboard'
import UpdateProfile from './pages/dashboard/UpdateProfile'
import FindDoctor from './pages/public/FindDoctor'
import GuidedSearch from './pages/public/GuidedSearch'
import Doctors from './pages/public/Doctors'
import StaffLogin from './pages/staff/StaffLogin'

// Routes where the navbar should be hidden
const NO_NAV = ['/login', '/register', '/staff/login']

function Layout() {
  const { pathname } = useLocation()
  return (
    <>
      {!NO_NAV.includes(pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/find" replace />} />
        <Route path="/clinician/:id" element={<ClinicianProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/book/:id" element={<BookAppointment />} />
        <Route path="/dashboard" element={<PatientDashboard />} />
        <Route path="/dashboard/appointments" element={<PatientAppointments />} />
        <Route path="/clinician-dashboard" element={<ClinicianDashboard />} />
        <Route path="/dashboard/profile" element={<UpdateProfile />} />
        <Route path="/find" element={<FindDoctor />} />
        <Route path="/find/triage" element={<GuidedSearch />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/staff/login" element={<StaffLogin />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
