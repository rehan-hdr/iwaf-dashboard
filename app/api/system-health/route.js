import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    await getAuthenticatedUser();

    const client = await clientPromise;
    const db = client.db('waf_db');

    // Run four queries in parallel. Each returns the most recent document
    // (or null) from its collection.
    const [mlBlockedLatest, mlAllowedLatest, modsecLatest, dreLatest] = await Promise.all([
      db.collection('ml_blocked_requests')
        .find({}, { projection: { timestamp: 1 } })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray(),
      db.collection('ml_allowed_requests')
        .find({}, { projection: { timestamp: 1 } })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray(),
      db.collection('attacks')
        .find({}, { projection: { shipped_at: 1 } })
        .sort({ shipped_at: -1 })
        .limit(1)
        .toArray(),
      db.collection('ml_rule_suggestions')
        .find({}, { projection: { analyzed_at: 1 } })
        .sort({ analyzed_at: -1 })
        .limit(1)
        .toArray(),
    ]);

    // Flask service liveness: most recent of either ML collection.
    const mlBlockedTs = mlBlockedLatest[0]?.timestamp ?? null;
    const mlAllowedTs = mlAllowedLatest[0]?.timestamp ?? null;
    const flaskLatest = pickMostRecent(mlBlockedTs, mlAllowedTs);

    const modsecTs = modsecLatest[0]?.shipped_at ?? null;
    const dreTs = dreLatest[0]?.analyzed_at ?? null;

    return NextResponse.json({
      success: true,
      data: {
        checked_at: new Date().toISOString(),
        subsystems: [
          {
            id: 'flask',
            name: 'Flask ML Service',
            last_activity: flaskLatest,
            description: 'Inline classification service. Status derived from latest ML decision logged to MongoDB.',
          },
          {
            id: 'mongodb',
            name: 'MongoDB',
            // If we got here, MongoDB is reachable. The page interprets a
            // missing or null last_activity for `mongodb` as "connected".
            last_activity: 'connected',
            description: "Document store. Status reflects whether the dashboard's server-side queries succeeded.",
          },
          {
            id: 'modsecurity',
            name: 'ModSecurity (CRS)',
            last_activity: modsecTs,
            description: 'Rule-based detection layer. Status derived from latest CRS-blocked request shipped to MongoDB.',
          },
          {
            id: 'dre',
            name: 'DRE Pipeline',
            last_activity: dreTs,
            description: 'Adaptive rule engine. Status reflects the timestamp of the most recent analysis run.',
          },
        ],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function pickMostRecent(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}
