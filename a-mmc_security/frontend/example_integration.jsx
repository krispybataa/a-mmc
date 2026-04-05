// example_integration.jsx - Add to App.jsx Routes

import ProtectedRoute from './frontend/ProtectedRoute'
import UnauthorizedPage from './frontend/UnauthorizedPage'
import { ROLES } from './shared/security_utils'

// Example protected admin section
<Route element={
  <ProtectedRoute roles={[ROLES.ADMIN]}>
    <Route path="/admin/*" element={<AdminDashboard />} />
  </ProtectedRoute>
} />

// Or inline:
<Route path="/secret-staff" element={
  <ProtectedRoute roles={['clinician', 'secretary']}>
    <StaffOnlyPage />
  </ProtectedRoute>
} />

// In component: useRoleGuard
import { useRoleGuard } from './frontend/useRoleGuard'
const { hasAccess } = useRoleGuard(['admin'])
if (!hasAccess) return <UnauthorizedPage />
