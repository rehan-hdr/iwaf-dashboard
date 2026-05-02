import { NextResponse } from 'next/server';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { role } = await getAuthenticatedUser();
    void role;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const flaskUrl = process.env.IWAF_API_URL;
    if (!flaskUrl) {
      return NextResponse.json({ error: 'IWAF_API_URL not configured' }, { status: 500 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let res;
    try {
      res = await fetch(`${flaskUrl}/dre/suggestions/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ notes: body.notes || '' }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: `Analysis service returned an unexpected response (HTTP ${res.status}).` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 504 });
    }
    return handleApiError(error);
  }
}
