import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    const now = new Date();

    // --- Blocked Today (400 = Bad Request rejected, 403 = Forbidden by WAF) ---
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const blockedToday = await collection.countDocuments({
      'transaction.response.http_code': { $in: [400, 403] },
      shipped_at: { $gte: todayStart },
    });

    // --- Blocked This Week ---
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const blockedThisWeek = await collection.countDocuments({
      'transaction.response.http_code': { $in: [400, 403] },
      shipped_at: { $gte: weekStart },
    });

    // --- For attack trend (last 24h) ---
    const dayAgo = new Date(now);
    dayAgo.setDate(now.getDate() - 1);

    // --- Top Attacking IPs ---
    const topIPs = await collection.aggregate([
      {
        $match: {
          'transaction.messages': { $exists: true, $not: { $size: 0 } },
        },
      },
      {
        $group: {
          _id: '$transaction.client_ip',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    const topAttackingIPs = topIPs.map((ip) => ({
      ip: ip._id,
      count: ip.count,
      country: ip._id.startsWith('192.168.') || ip._id.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip._id) || ip._id === '127.0.0.1'
        ? 'Local Network'
        : 'External',
    }));

    // --- Attack Trend by Hour (last 24h) ---
    // Get all attacks from last 24h with their tags
    const recentAttacks = await collection.aggregate([
      {
        $match: {
          'transaction.messages': { $exists: true, $not: { $size: 0 } },
          shipped_at: { $gte: dayAgo },
        },
      },
      {
        $unwind: '$transaction.messages',
      },
      {
        $project: {
          hour: { $hour: '$shipped_at' },
          tags: '$transaction.messages.details.tags',
        },
      },
    ]).toArray();

    // Build hourly breakdown
    const hourlyMap = {};
    for (let h = 0; h < 24; h += 2) {
      const label = `${String(h).padStart(2, '0')}:00`;
      hourlyMap[label] = { hour: label, sqli: 0, xss: 0, lfi: 0, rce: 0, other: 0 };
    }

    for (const attack of recentAttacks) {
      const hourBucket = Math.floor(attack.hour / 2) * 2;
      const label = `${String(hourBucket).padStart(2, '0')}:00`;
      if (!hourlyMap[label]) continue;

      const tags = attack.tags || [];
      let categorized = false;
      for (const tag of tags) {
        if (tag === 'attack-sqli') { hourlyMap[label].sqli++; categorized = true; break; }
        if (tag === 'attack-xss') { hourlyMap[label].xss++; categorized = true; break; }
        if (tag === 'attack-lfi') { hourlyMap[label].lfi++; categorized = true; break; }
        if (tag === 'attack-rce') { hourlyMap[label].rce++; categorized = true; break; }
      }
      if (!categorized) hourlyMap[label].other++;
    }

    const attackTrendByHour = Object.values(hourlyMap);

    // --- ML Blocked Trend by Hour (last 24h) ---
    const mlBlockedCol = db.collection('ml_blocked_requests');
    const mlAllowedCol = db.collection('ml_allowed_requests');

    const recentMlBlocked = await mlBlockedCol.aggregate([
      { $match: { timestamp: { $gte: dayAgo } } },
      { $project: { hour: { $hour: '$timestamp' }, attack_type: 1 } },
    ]).toArray();

    // Merge ML data into the same hourly buckets
    for (const item of recentMlBlocked) {
      const hourBucket = Math.floor(item.hour / 2) * 2;
      const label = `${String(hourBucket).padStart(2, '0')}:00`;
      if (!hourlyMap[label]) continue;
      const type = (item.attack_type || '').toLowerCase();
      if (type === 'sqli') hourlyMap[label].ml_sqli = (hourlyMap[label].ml_sqli || 0) + 1;
      else if (type === 'xss') hourlyMap[label].ml_xss = (hourlyMap[label].ml_xss || 0) + 1;
      else if (type === 'lfi') hourlyMap[label].ml_lfi = (hourlyMap[label].ml_lfi || 0) + 1;
      else if (type === 'probe') hourlyMap[label].ml_probe = (hourlyMap[label].ml_probe || 0) + 1;
    }

    // Ensure all hourly buckets have ML fields
    const finalTrend = Object.values(hourlyMap).map(h => ({
      ...h,
      ml_sqli: h.ml_sqli || 0,
      ml_xss: h.ml_xss || 0,
      ml_lfi: h.ml_lfi || 0,
      ml_probe: h.ml_probe || 0,
    }));

    // --- Total stats (400 + 403 = blocked/rejected by WAF) ---
    const totalBlocked = await collection.countDocuments({
      'transaction.response.http_code': { $in: [400, 403] },
    });
    const totalAttacks = await collection.countDocuments({
      'transaction.messages': { $exists: true, $not: { $size: 0 } },
    });

    // --- ML Layer Stats ---
    const [mlBlockedToday, mlBlockedThisWeek, mlAllowedToday, mlAllowedThisWeek, totalMlBlocked, totalMlAllowed] = await Promise.all([
      mlBlockedCol.countDocuments({ timestamp: { $gte: todayStart } }),
      mlBlockedCol.countDocuments({ timestamp: { $gte: weekStart } }),
      mlAllowedCol.countDocuments({ timestamp: { $gte: todayStart } }),
      mlAllowedCol.countDocuments({ timestamp: { $gte: weekStart } }),
      mlBlockedCol.countDocuments(),
      mlAllowedCol.countDocuments(),
    ]);

    // Top ML attacking IPs
    const topMlIPs = await mlBlockedCol.aggregate([
      { $group: { _id: '$source_ip', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();

    const topMlAttackingIPs = topMlIPs.map((ip) => ({
      ip: ip._id,
      count: ip.count,
      country: ip._id.startsWith('192.168.') || ip._id.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip._id) || ip._id === '127.0.0.1'
        ? 'Local Network'
        : 'External',
    }));

    return NextResponse.json({
      success: true,
      data: {
        blockedToday,
        blockedThisWeek,
        topAttackingIPs,
        attackTrendByHour: finalTrend,
        totalBlocked,
        totalAttacks,
        // ML Layer data
        mlBlockedToday,
        mlBlockedThisWeek,
        mlAllowedToday,
        mlAllowedThisWeek,
        totalMlBlocked,
        totalMlAllowed,
        topMlAttackingIPs,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
