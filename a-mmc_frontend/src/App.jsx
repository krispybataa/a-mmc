import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import StaffLayout from './components/StaffLayout'
import AdminLayout from './components/AdminLayout'
import ClinicianProfile from './pages/public/ClinicianProfile'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import BookAppointment from './pages/public/BookAppointment'
import PatientDashboard from './pages/dashboard/PatientDashboard'
import PatientAppointments from './pages/dashboard/PatientAppointments'
import ClinicianDashboard from './pages/dashboard/ClinicianDashboard'
import ClinicianProfileManager from './pages/dashboard/ClinicianProfileManager'
import ScheduleManager from './pages/dashboard/ScheduleManager'
import UpdateProfile from './pages/dashboard/UpdateProfile'
import ChangePassword from './pages/dashboard/ChangePassword'
import FindDoctor from './pages/public/FindDoctor'
import GuidedSearch from './pages/public/GuidedSearch'
import Doctors from './pages/public/Doctors'
import StaffLogin from './pages/staff/StaffLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminClinicians from './pages/admin/AdminClinicians'
import AdminSecretaries from './pages/admin/AdminSecretaries'
import AdminPatients from './pages/admin/AdminPatients'
import AdminEmailPreviews from './pages/admin/AdminEmailPreviews'

// Routes where the patient navbar should be hidden
const NO_NAV = ['/login', '/register']

function Layout() {
  const { pathname } = useLocation()
  return (
    <>
      {!NO_NAV.includes(pathname) && <Navbar />}
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Admin shell — auth-guarded (role: admin), sidebar layout ── */}
        <Route element={<AdminLayout />}>
          <Route path="/admin"              element={<AdminDashboard />} />
          <Route path="/admin/clinicians"   element={<AdminClinicians />} />
          <Route path="/admin/secretaries"  element={<AdminSecretaries />} />
          <Route path="/admin/patients"         element={<AdminPatients />} />
          <Route path="/admin/email-previews"   element={<AdminEmailPreviews />} />
        </Route>

        {/* ── Staff shell — auth-guarded, own topbar, no patient navbar ── */}
        <Route element={<StaffLayout />}>
          <Route path="/clinician-dashboard"          element={<ClinicianDashboard />} />
          <Route path="/clinician-dashboard/profile"          element={<ClinicianProfileManager />} />
          <Route path="/clinician-dashboard/schedule"         element={<ScheduleManager />} />
          <Route path="/clinician-dashboard/change-password"  element={<ChangePassword />} />
        </Route>

        {/* ── Staff login — no layout at all ── */}
        <Route path="/staff/login" element={<StaffLogin />} />

        {/* ── Public + patient routes — patient navbar (hidden on /login, /register) ── */}
        <Route element={<Layout />}>
          <Route path="/"                       element={<Navigate to="/find" replace />} />
          <Route path="/find"                   element={<FindDoctor />} />
          <Route path="/find/triage"            element={<GuidedSearch />} />
          <Route path="/doctors"                element={<Doctors />} />
          <Route path="/clinician/:id"          element={<ClinicianProfile />} />
          <Route path="/book/:id"               element={<BookAppointment />} />
          <Route path="/login"                  element={<Login />} />
          <Route path="/register"               element={<Register />} />
          <Route path="/dashboard"              element={<PatientDashboard />} />
          <Route path="/dashboard/appointments" element={<PatientAppointments />} />
          <Route path="/dashboard/profile"      element={<UpdateProfile />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}
