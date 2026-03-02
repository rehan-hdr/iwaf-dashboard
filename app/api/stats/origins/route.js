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

    // Get IPs grouped across all 3 collections
    const [attackIPs, mlBlockedIPs, mlAllowedIPs] = await Promise.all([
      attacksCol.aggregate([
        { $group: { _id: '$transaction.client_ip', count: { $sum: 1 }, lastSeen: { $max: '$shipped_at' } } },
      ]).toArray(),
      mlBlockedCol.aggregate([
        { $group: { _id: '$source_ip', count: { $sum: 1 }, lastSeen: { $max: '$timestamp' } } },
      ]).toArray(),
      mlAllowedCol.aggregate([
        { $group: { _id: '$source_ip', count: { $sum: 1 }, lastSeen: { $max: '$timestamp' } } },
      ]).toArray(),
    ]);

    // Merge all IPs into a single map
    const ipMap = {};
    for (const row of [...attackIPs, ...mlBlockedIPs, ...mlAllowedIPs]) {
      if (!row._id) continue;
      if (!ipMap[row._id]) {
        ipMap[row._id] = { count: 0, lastSeen: null };
      }
      ipMap[row._id].count += row.count;
      if (!ipMap[row._id].lastSeen || (row.lastSeen && row.lastSeen > ipMap[row._id].lastSeen)) {
        ipMap[row._id].lastSeen = row.lastSeen;
      }
    }

    // Sort by count descending, take top 10
    const ipData = Object.entries(ipMap)
      .map(([ip, data]) => ({ _id: ip, count: data.count, lastSeen: data.lastSeen }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Helper function to get country from IP using GeoIP lookup
    async function getCountryFromIP(ip) {
      // Skip localhost/private IPs - show actual IP for local networks
      if (ip === '127.0.0.1') {
        return { country: 'Localhost', countryCode: 'LH', ip: ip };
      }
      if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        return { country: 'Private Network', countryCode: 'PN', ip: ip };
      }

      try {
        // Using ipapi.co free API (1000 requests/day)
        const response = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          return {
            country: data.country_name || 'Unknown',
            countryCode: data.country_code || 'XX',
          };
        }
      } catch (error) {
        console.log(`GeoIP lookup failed for ${ip}:`, error.message);
      }
      
      return { country: 'Unknown', countryCode: 'XX' };
    }

    // Get top 3 IPs and lookup their countries + calculate real trend
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const topOrigins = await Promise.all(
      ipData.slice(0, 3).map(async (item) => {
        const geoData = await getCountryFromIP(item._id);
        
        // For local IPs, show the IP in the country field to distinguish them
        const displayCountry = geoData.ip 
          ? `${geoData.country} (${geoData.ip})` 
          : geoData.country;

        // Calculate real trend: compare last 7 days vs previous 7 days across all collections
        const [curAtk, curMlB, curMlA, prevAtk, prevMlB, prevMlA] = await Promise.all([
          attacksCol.countDocuments({ 'transaction.client_ip': item._id, shipped_at: { $gte: sevenDaysAgo } }),
          mlBlockedCol.countDocuments({ source_ip: item._id, timestamp: { $gte: sevenDaysAgo } }),
          mlAllowedCol.countDocuments({ source_ip: item._id, timestamp: { $gte: sevenDaysAgo } }),
          attacksCol.countDocuments({ 'transaction.client_ip': item._id, shipped_at: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
          mlBlockedCol.countDocuments({ source_ip: item._id, timestamp: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
          mlAllowedCol.countDocuments({ source_ip: item._id, timestamp: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
        ]);
        const currentWeekCount = curAtk + curMlB + curMlA;
        const previousWeekCount = prevAtk + prevMlB + prevMlA;

        let trendPercent = 0;
        let trendUp = true;
        if (previousWeekCount > 0) {
          trendPercent = Math.round(((currentWeekCount - previousWeekCount) / previousWeekCount) * 100);
          trendUp = trendPercent >= 0;
          trendPercent = Math.abs(trendPercent);
        } else if (currentWeekCount > 0) {
          trendPercent = 100; // All new traffic
          trendUp = true;
        }

        return {
          ip: item._id,
          country: displayCountry,
          countryCode: geoData.countryCode,
          requestsPerSec: (item.count / (7 * 24 * 60 * 60)).toFixed(3),
          totalRequests: item.count,
          trend: trendPercent,
          trendUp,
          lastSeen: item.lastSeen
        };
      })
    );

    console.log('Origins API:', topOrigins);

    return NextResponse.json({
      success: true,
      data: {
        topOrigins,
        totalIPs: ipData.length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
