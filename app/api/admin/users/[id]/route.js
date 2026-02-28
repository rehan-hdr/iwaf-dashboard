import { NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { getAuthenticatedUser, requireRole, handleApiError } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

export async function PATCH(request, { params }) {
  try {
    const { role } = await getAuthenticatedUser();
    requireRole(role, [ROLES.SUPER_ADMIN]);

    const { id } = await params;
    const { role: newRole } = await request.json();

    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    await clerk.users.updateUser(id, {
      publicMetadata: { role: newRole },
    });

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { role } = await getAuthenticatedUser();
    requireRole(role, [ROLES.SUPER_ADMIN]);

    const { id } = await params;

    // Prevent self-deletion
    const user = await currentUser();
    if (user.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
