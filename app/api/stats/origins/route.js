import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET() {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    // Get attacks grouped by client IP to determine origin
    const ipData = await collection.aggregate([
      {
        $group: {
          _id: '$transaction.client_ip',
          count: { $sum: 1 },
          lastSeen: { $max: '$shipped_at' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Helper function to get country from IP using GeoIP lookup
    async function getCountryFromIP(ip) {
      // Skip localhost/private IPs - show actual IP for local networks
      if (ip === '127.0.0.1') {
        return { country: 'Localhost', countryCode: 'LH', flag: '🏠', ip: ip };
      }
      if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        return { country: 'Private Network', countryCode: 'PN', flag: '🏢', ip: ip };
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
            flag: getCountryFlag(data.country_code)
          };
        }
      } catch (error) {
        console.log(`GeoIP lookup failed for ${ip}:`, error.message);
      }
      
      return { country: 'Unknown', countryCode: 'XX', flag: '🌍' };
    }

    // Helper to convert country code to flag emoji
    function getCountryFlag(countryCode) {
      if (!countryCode || countryCode === 'XX') return '🌍';
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
      return String.fromCodePoint(...codePoints);
    }

    // Get top 3 IPs and lookup their countries
    const topOrigins = await Promise.all(
      ipData.slice(0, 3).map(async (item, index) => {
        const geoData = await getCountryFromIP(item._id);
        
        // For local IPs, show the IP in the country field to distinguish them
        const displayCountry = geoData.ip 
          ? `${geoData.country} (${geoData.ip})` 
          : geoData.country;
        
        return {
          ip: item._id,
          country: displayCountry,
          countryCode: geoData.countryCode,
          flag: geoData.flag,
          requestsPerSec: (item.count / (7 * 24 * 60 * 60)).toFixed(3),
          totalRequests: item.count,
          trend: Math.floor(Math.random() * 20), // Placeholder trend
          trendUp: Math.random() > 0.5,
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
