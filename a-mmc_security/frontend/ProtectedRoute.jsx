import { Navigate } from 'react-router-dom'
import { useAuth } from '../../src/context/AuthContext'  // Adjust path
import UnauthorizedPage from './UnauthorizedPage'

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, authLoading } = useAuth()

  if (authLoading) return null  // Wait for silent refresh

  if (!user) {
    // Redirect to appropriate login
    const isStaffPath = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/clinician-dashboard')
    return <Navigate to={isStaffPath ? '/staff/login' : '/login'} replace state={{ from: window.location.pathname }} />
  }

  if (roles.length && !roles.includes(user.role)) {
    return <UnauthorizedPage reason={`Requires one of: ${roles.join(', ')}. You have: ${user.role}`} />
  }

  return children ? children : children
}
