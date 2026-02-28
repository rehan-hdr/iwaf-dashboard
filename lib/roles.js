/**
 * Role-Based Access Control (RBAC) configuration.
 * Single source of truth for all roles and permissions.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SECURITY_ANALYST: 'security_analyst',
  VIEWER: 'viewer',
};

/** Human-readable labels for each role */
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Administrator',
  [ROLES.SECURITY_ANALYST]: 'Security Analyst',
  [ROLES.VIEWER]: 'Viewer / Auditor',
};

/**
 * Permission map — each key is a permission, the value is an
 * array of roles that are granted that permission.
 */
export const PERMISSIONS = {
  // ── Read-only (all roles) ──────────────────────────────────
  'dashboard:view':       [ROLES.SUPER_ADMIN, ROLES.SECURITY_ANALYST, ROLES.VIEWER],
  'logs:view':            [ROLES.SUPER_ADMIN, ROLES.SECURITY_ANALYST, ROLES.VIEWER],
  'reports:export':       [ROLES.SUPER_ADMIN, ROLES.SECURITY_ANALYST, ROLES.VIEWER],

  // ── Security Analyst + Super Admin ─────────────────────────
  'ip:blocklist':         [ROLES.SUPER_ADMIN, ROLES.SECURITY_ANALYST],
  'ip:whitelist':         [ROLES.SUPER_ADMIN, ROLES.SECURITY_ANALYST],
  'requests:investigate': [ROLES.SUPER_ADMIN, ROLES.SECURITY_ANALYST],

  // ── Super Admin only ───────────────────────────────────────
  'users:manage':         [ROLES.SUPER_ADMIN],
  'users:roles':          [ROLES.SUPER_ADMIN],
  'firewall:configure':   [ROLES.SUPER_ADMIN],
  'rules:manage':         [ROLES.SUPER_ADMIN],
  'settings:modify':      [ROLES.SUPER_ADMIN],
};

/**
 * Check if a role has a specific permission.
 * @param {string} userRole — the user's role string
 * @param {string} permission — a key from PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(userRole, permission) {
  return PERMISSIONS[permission]?.includes(userRole) ?? false;
}

/**
 * Check if a role is at least as privileged as the given minimum role.
 * Hierarchy: super_admin > security_analyst > viewer
 */
const ROLE_HIERARCHY = [ROLES.VIEWER, ROLES.SECURITY_ANALYST, ROLES.SUPER_ADMIN];

export function isAtLeast(userRole, minimumRole) {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
}
