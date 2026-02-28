'use client';

import { useUser } from '@clerk/nextjs';
import { hasPermission } from '@/lib/roles';

/**
 * Client-side permission gate.
 * Renders children only if the current user's role has the given permission.
 *
 * Usage:
 *   <RoleGate permission="users:manage">
 *     <AdminPanel />
 *   </RoleGate>
 */
export default function RoleGate({ permission, children, fallback = null }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;

  const role = user?.publicMetadata?.role || 'viewer';

  if (!hasPermission(role, permission)) {
    return fallback;
  }

  return children;
}
