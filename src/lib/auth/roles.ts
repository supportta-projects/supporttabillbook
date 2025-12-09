import { UserRole } from '@/types'

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 4,
  tenant_owner: 3,
  branch_admin: 2,
  branch_staff: 1,
}

// Check if user has required role or higher
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Check if user can access tenant
export function canAccessTenant(userRole: UserRole, userTenantId: string, targetTenantId: string): boolean {
  if (userRole === 'superadmin') return true
  return userTenantId === targetTenantId
}

// Check if user can access branch
export function canAccessBranch(
  userRole: UserRole,
  userTenantId: string,
  userBranchId: string | undefined,
  targetBranchId: string,
  targetTenantId: string
): boolean {
  // Superadmin can access all
  if (userRole === 'superadmin') return true
  
  // Tenant owner can access all branches in their tenant
  if (userRole === 'tenant_owner' && userTenantId === targetTenantId) return true
  
  // Branch admin/staff can only access their own branch
  if ((userRole === 'branch_admin' || userRole === 'branch_staff') && userBranchId === targetBranchId) {
    return userTenantId === targetTenantId
  }
  
  return false
}

// Check if user can perform action
export function canPerformAction(userRole: UserRole, action: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    superadmin: ['all'],
    tenant_owner: ['view', 'create', 'update', 'delete', 'manage_users', 'manage_branches'],
    branch_admin: ['view', 'create', 'update', 'billing', 'stock_management', 'purchases', 'expenses'],
    branch_staff: ['view', 'billing', 'stock_view', 'stock_in', 'stock_out', 'expenses_view', 'expenses_create'],
  }

  const userPermissions = permissions[userRole]
  return userPermissions.includes('all') || userPermissions.includes(action)
}

