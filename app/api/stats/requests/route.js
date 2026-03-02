import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET(request) {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const attacksCol = db.collection('attacks');
    const mlBlockedCol = db.collection('ml_blocked_requests');
    const mlAllowedCol = db.collection('ml_allowed_requests');

    // Get week parameter from URL
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || 'current';

    // Get total number of requests across all collections
    const [totalAttacks, totalMlBlocked, totalMlAllowed] = await Promise.all([
      attacksCol.countDocuments(),
      mlBlockedCol.countDocuments(),
      mlAllowedCol.countDocuments(),
    ]);
    const totalRequests = totalAttacks + totalMlBlocked + totalMlAllowed;

    // Calculate date range based on actual calendar week (Mon–Sun)
    const now = new Date();
    const todayDow = now.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
    const daysSinceMonday = (todayDow + 6) % 7; // Mon=0, Tue=1, ... Sun=6
    let startDate, endDate;

    if (week === 'previous') {
      // Previous calendar week Mon 00:00 → Sun 23:59
      startDate = new Date(now);
      startDate.setUTCDate(now.getUTCDate() - daysSinceMonday - 7);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 7);
    } else {
      // Current calendar week Mon 00:00 → now
      startDate = new Date(now);
      startDate.setUTCDate(now.getUTCDate() - daysSinceMonday);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = now;
    }

    // Count recent requests across all 3 collections
    const [recentAttacks, recentMlBlocked, recentMlAllowed] = await Promise.all([
      attacksCol.countDocuments({ shipped_at: { $gte: startDate, $lt: endDate } }),
      mlBlockedCol.countDocuments({ timestamp: { $gte: startDate, $lt: endDate } }),
      mlAllowedCol.countDocuments({ timestamp: { $gte: startDate, $lt: endDate } }),
    ]);
    const recentRequests = recentAttacks + recentMlBlocked + recentMlAllowed;

    // Get data for chart - group by day of week across all 3 collections
    const aggByDow = (col, dateField) => col.aggregate([
      { $match: { [dateField]: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: { $dayOfWeek: `$${dateField}` }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]).toArray();

    const [dailyAttacks, dailyMlBlocked, dailyMlAllowed] = await Promise.all([
      aggByDow(attacksCol, 'shipped_at'),
      aggByDow(mlBlockedCol, 'timestamp'),
      aggByDow(mlAllowedCol, 'timestamp'),
    ]);

    // Merge all daily data by $dayOfWeek key
    const mergedDaily = {};
    for (const row of [...dailyAttacks, ...dailyMlBlocked, ...dailyMlAllowed]) {
      mergedDaily[row._id] = (mergedDaily[row._id] || 0) + row.count;
    }

    // Map $dayOfWeek (1=Sun..7=Sat) to Mon-first order
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dowToIndex = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 1: 6 };

    // For current week, only show days up to today
    const todayIndex = daysSinceMonday; // Mon=0 ... Sun=6
    const chartData = dayNames.map((day, index) => {
      if (week === 'current' && index > todayIndex) {
        return { day, count: 0, future: true };
      }
      const dow = Object.keys(dowToIndex).find(k => dowToIndex[k] === index);
      return {
        day,
        count: mergedDaily[Number(dow)] || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        recentRequests,
        chartData,
        breakdown: {
          modsecurity: totalAttacks,
          mlBlocked: totalMlBlocked,
          mlAllowed: totalMlAllowed,
        },
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
