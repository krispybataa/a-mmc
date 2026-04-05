// useRoleGuard.js - Hook for fine-grained role checks in components
import { useAuth } from '../../src/context/AuthContext'  // Adjust path

export function useRoleGuard(requiredRoles = []) {
  const { user, authLoading } = useAuth()

  if (authLoading) return { hasAccess: false, loading: true }

  const hasAccess = !requiredRoles.length || requiredRoles.includes(user?.role)

  return {
    hasAccess,
    userRole: user?.role,
    loading: false,
    error: hasAccess ? null : `Requires role: ${requiredRoles.join(', ')}`
  }
}

// Usage:
// const { hasAccess, error } = useRoleGuard(['admin'])
// if (!hasAccess) return <div>{error}</div>
