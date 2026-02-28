import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    // Get unique client IPs (users)
    const uniqueIPs = await collection.distinct('transaction.client_ip');
    const totalUsers = uniqueIPs.length;

    // Get users from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await collection.distinct('transaction.client_ip', {
      'shipped_at': { $gte: sevenDaysAgo.toISOString() }
    });

    // Classify users as normal or malicious based on attack presence
    // All IPs in attacks collection are considered malicious
    const maliciousUsers = totalUsers;
    const normalUsers = 0; // Since this is attacks collection

    // Calculate percentages
    const maliciousPercentage = totalUsers > 0 ? ((maliciousUsers / totalUsers) * 100).toFixed(1) : 0;
    const normalPercentage = totalUsers > 0 ? ((normalUsers / totalUsers) * 100).toFixed(1) : 0;

    console.log('Total Users API:', {
      totalUsers,
      maliciousUsers,
      normalUsers,
      recentUsers: recentUsers.length
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        maliciousUsers,
        normalUsers,
        maliciousPercentage: parseFloat(maliciousPercentage),
        normalPercentage: parseFloat(normalPercentage),
        recentUsers: recentUsers.length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
