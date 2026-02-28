import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET(request) {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    // Get week parameter from URL
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || 'current';

    // Get total number of requests
    const totalRequests = await collection.countDocuments();

    // Calculate date range based on week filter
    const now = new Date();
    const sevenDaysAgo = new Date();
    const fourteenDaysAgo = new Date();
    
    if (week === 'previous') {
      sevenDaysAgo.setDate(now.getDate() - 14);
      fourteenDaysAgo.setDate(now.getDate() - 14);
    } else {
      sevenDaysAgo.setDate(now.getDate() - 7);
    }

    // Convert shipped_at string to Date for comparison
    const startDate = week === 'previous' ? fourteenDaysAgo : sevenDaysAgo;
    const endDate = week === 'previous' ? sevenDaysAgo : now;
    
    const recentRequests = await collection.countDocuments({
      'shipped_at': { 
        $gte: startDate.toISOString(),
        $lt: endDate.toISOString()
      }
    });

    // Calculate average requests per second (last 7 days)
    const secondsInWeek = 7 * 24 * 60 * 60;
    const avgRequestsPerSecond = (recentRequests / secondsInWeek).toFixed(2);

    // Get data for chart - group by day of week
    const dailyData = await collection.aggregate([
      {
        $addFields: {
          shipDate: { $toDate: '$shipped_at' }
        }
      },
      {
        $match: {
          'shipDate': { 
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$shipDate' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]).toArray();

    const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = dayNames.map((day, index) => {
      const dayData = dailyData.find(d => d._id === index + 1);
      return {
        day,
        count: dayData ? dayData.count : 0
      };
    });

    console.log('Total Requests API:', {
      totalRequests,
      avgRequestsPerSecond,
      recentRequests
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        avgRequestsPerSecond: parseFloat(avgRequestsPerSecond),
        recentRequests,
        chartData
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
