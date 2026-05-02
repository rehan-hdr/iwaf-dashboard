import { NextResponse } from 'next/server';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function POST(request) {
  try {
    const { role } = await getAuthenticatedUser();
    void role;

    const body = await request.json().catch(() => ({}));
    const hours = body.hours || 24;

    const flaskUrl = process.env.IWAF_API_URL;
    if (!flaskUrl) {
      return NextResponse.json({ error: 'IWAF_API_URL not configured' }, { status: 500 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);

    let res;
    try {
      res = await fetch(`${flaskUrl}/dre/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ hours, save: true }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[analyze] Non-JSON response from Flask:', text.slice(0, 300));
      return NextResponse.json(
        { error: `Analysis service returned an unexpected response (HTTP ${res.status}). It may be offline or starting up.` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Analysis service timed out. It may still be running — check suggestions in a moment.' },
        { status: 504 }
      );
    }
    return handleApiError(error);
  }
}
