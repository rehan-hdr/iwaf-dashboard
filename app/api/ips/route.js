import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');

    const attacksCol = db.collection('attacks');
    const mlBlockedCol = db.collection('ml_blocked_requests');
    const mlAllowedCol = db.collection('ml_allowed_requests');
    const blockedIpsCol = db.collection('blocked_ips');

    // Aggregate unique IPs and request counts from all three collections
    const [atkAgg, mlbAgg, mlaAgg, blockedDocs] = await Promise.all([
      attacksCol
        .aggregate([
          { $group: { _id: '$transaction.client_ip', count: { $sum: 1 } } },
        ])
        .toArray(),
      mlBlockedCol
        .aggregate([{ $group: { _id: '$source_ip', count: { $sum: 1 } } }])
        .toArray(),
      mlAllowedCol
        .aggregate([{ $group: { _id: '$source_ip', count: { $sum: 1 } } }])
        .toArray(),
      blockedIpsCol.find({}).toArray(),
    ]);

    // Build a map of blocked status by IP
    const blockedMap = {};
    for (const doc of blockedDocs) {
      if (doc.ip) blockedMap[doc.ip] = doc.blocked === true;
    }

    // Merge counts into a unified IP map
    const ipMap = {};
    const add = (ip, count) => {
      if (!ip) return;
      ipMap[ip] = (ipMap[ip] || 0) + count;
    };

    for (const r of atkAgg) add(r._id, r.count);
    for (const r of mlbAgg) add(r._id, r.count);
    for (const r of mlaAgg) add(r._id, r.count);

    const ips = Object.entries(ipMap)
      .map(([ip, requestCount]) => ({
        ip,
        requestCount,
        blocked: blockedMap[ip] ?? false,
      }))
      .sort((a, b) => b.requestCount - a.requestCount);

    return NextResponse.json({ success: true, ips });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    await getAuthenticatedUser();
    const { ip, blocked } = await request.json();

    if (!ip || typeof blocked !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'ip (string) and blocked (boolean) are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('waf_db');
    const blockedIpsCol = db.collection('blocked_ips');

    await blockedIpsCol.updateOne(
      { ip },
      { $set: { ip, blocked } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, ip, blocked });
  } catch (err) {
    return handleApiError(err);
  }
}
