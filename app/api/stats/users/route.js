import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const attacksCol = db.collection('attacks');
    const mlBlockedCol = db.collection('ml_blocked_requests');
    const mlAllowedCol = db.collection('ml_allowed_requests');

    // Distinct IPs per collection
    const [atkIPs, mlbIPs, mlaIPs] = await Promise.all([
      attacksCol.distinct('transaction.client_ip'),
      mlBlockedCol.distinct('source_ip'),
      mlAllowedCol.distinct('source_ip'),
    ]);

    const maliciousSet = new Set([...atkIPs, ...mlbIPs].filter(Boolean));
    const benignSet = new Set(mlaIPs.filter(Boolean));
    const allIPs = new Set([...maliciousSet, ...benignSet]);

    const totalUsers = allIPs.size;
    // Malicious: any IP that has triggered a block
    const maliciousUsers = maliciousSet.size;
    // Normal: IPs that have ONLY ever sent benign traffic (never blocked)
    const normalUsers = [...benignSet].filter(ip => !maliciousSet.has(ip)).length;

    const maliciousPercentage = totalUsers > 0 ? parseFloat(((maliciousUsers / totalUsers) * 100).toFixed(1)) : 0;
    const normalPercentage = totalUsers > 0 ? parseFloat(((normalUsers / totalUsers) * 100).toFixed(1)) : 0;

    // Recent unique IPs across all collections (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [recentAtk, recentMlb, recentMla] = await Promise.all([
      attacksCol.distinct('transaction.client_ip', { shipped_at: { $gte: sevenDaysAgo } }),
      mlBlockedCol.distinct('source_ip', { timestamp: { $gte: sevenDaysAgo } }),
      mlAllowedCol.distinct('source_ip', { timestamp: { $gte: sevenDaysAgo } }),
    ]);
    const recentUsers = new Set([...recentAtk, ...recentMlb, ...recentMla].filter(Boolean)).size;

    // Request-level breakdown (for context)
    const [totalAttackReqs, totalMlBlockedReqs, totalMlAllowedReqs] = await Promise.all([
      attacksCol.countDocuments({ 'transaction.messages': { $exists: true, $not: { $size: 0 } } }),
      mlBlockedCol.countDocuments(),
      mlAllowedCol.countDocuments(),
    ]);
    const totalMaliciousRequests = totalAttackReqs + totalMlBlockedReqs;
    const totalBenignRequests = totalMlAllowedReqs;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        maliciousUsers,
        normalUsers,
        maliciousPercentage,
        normalPercentage,
        recentUsers,
        // Request-level stats (shown as context in widget)
        totalMaliciousRequests,
        totalBenignRequests,
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

