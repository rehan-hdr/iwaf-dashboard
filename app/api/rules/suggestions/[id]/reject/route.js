import { NextResponse } from 'next/server';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { role } = await getAuthenticatedUser();

    // Optional: restrict to admin
    // if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    void role;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const flaskUrl = process.env.IWAF_API_URL;
    if (!flaskUrl) {
      return NextResponse.json({ error: 'IWAF_API_URL not configured' }, { status: 500 });
    }

    const res = await fetch(`${flaskUrl}/dre/suggestions/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ reason: body.reason || '' }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return handleApiError(error);
  }
}
