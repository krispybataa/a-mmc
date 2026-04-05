// shared/security_utils.js - Shared role enums and helpers

export const ROLES = {
  PATIENT: 'patient',
  CLINICIAN: 'clinician',
  SECRETARY: 'secretary',
  ADMIN: 'admin'
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Helper: Check if user can access based on allowed roles
export function canAccess(userRole, allowedRoles) {
  return allowedRoles.includes(userRole)
}

// Usage in components:
// import { ROLES, canAccess } from '../shared/security_utils'
// if (!canAccess(user.role, [ROLES.ADMIN])) return null
```
</xai:function_call}





<xai:function_call name="create_file">
<parameter name="absolute_path">a-mmc_security/TODO.md
