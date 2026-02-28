import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requireRole, handleApiError } from '@/lib/auth';
import { ROLES, ROLE_LABELS } from '@/lib/roles';

export async function GET() {
  try {
    const { role } = await getAuthenticatedUser();
    requireRole(role, [ROLES.SUPER_ADMIN]);

    const clerk = await clerkClient();
    const usersResponse = await clerk.users.getUserList({ limit: 100 });

    const users = usersResponse.data.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || 'N/A',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.publicMetadata?.role || 'viewer',
      roleLabel: ROLE_LABELS[user.publicMetadata?.role || 'viewer'],
      imageUrl: user.imageUrl,
      lastSignInAt: user.lastSignInAt,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { role } = await getAuthenticatedUser();
    requireRole(role, [ROLES.SUPER_ADMIN]);

    const { email, role: assignedRole } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const validRoles = Object.values(ROLES);
    if (assignedRole && !validRoles.includes(assignedRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();

    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: assignedRole || 'viewer' },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.emailAddress,
        role: assignedRole || 'viewer',
        status: invitation.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
