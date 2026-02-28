import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ROLES } from '@/lib/roles';

/**
 * Get the authenticated user's info (server-side, for API routes).
 * Returns { userId, role }.  Throws 401 if not authenticated.
 */
export async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) {
    throw { status: 401, message: 'Not authenticated' };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = user.publicMetadata?.role || ROLES.VIEWER;

  return { userId, role, user };
}

/**
 * Require a specific role (or set of roles).
 * Call after getAuthenticatedUser().
 */
export function requireRole(userRole, allowedRoles) {
  if (!allowedRoles.includes(userRole)) {
    throw { status: 403, message: 'Forbidden — insufficient permissions' };
  }
}

/**
 * Standard API error handler — use in catch blocks.
 */
export function handleApiError(error) {
  // Handle our own thrown errors ({ status, message })
  if (error?.status && error?.message) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status }
    );
  }
  // Handle Clerk API errors
  if (error?.clerkError || error?.errors) {
    const clerkMsg = error.errors?.[0]?.longMessage || error.errors?.[0]?.message || 'Clerk error';
    console.error('Clerk API Error:', clerkMsg);
    return NextResponse.json(
      { success: false, error: clerkMsg },
      { status: error.status || 422 }
    );
  }
  console.error('API Error:', error);
  return NextResponse.json(
    { success: false, error: error?.message || 'Internal server error' },
    { status: 500 }
  );
}
