import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    // Get severity distribution
    const severityData = await collection.aggregate([
      {
        $unwind: '$transaction.messages'
      },
      {
        $group: {
          _id: '$transaction.messages.details.severity',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]).toArray();

    const severityMap = {
      '0': { name: 'Emergency', color: '#DC2626', level: 'Critical' },
      '1': { name: 'Alert', color: '#EA580C', level: 'High' },
      '2': { name: 'Critical', color: '#F59E0B', level: 'High' },
      '3': { name: 'Error', color: '#F59E0B', level: 'Medium' },
      '4': { name: 'Warning', color: '#10B981', level: 'Low' },
      '5': { name: 'Notice', color: '#3B82F6', level: 'Info' }
    };

    const formattedSeverity = severityData.map(item => ({
      severity: item._id,
      name: severityMap[item._id]?.name || 'Unknown',
      level: severityMap[item._id]?.level || 'Unknown',
      color: severityMap[item._id]?.color || '#6B7280',
      count: item.count
    }));

    // Get HTTP methods
    const methodsData = await collection.aggregate([
      {
        $group: {
          _id: '$transaction.request.method',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    // Get HTTP response codes
    const responseCodesData = await collection.aggregate([
      {
        $group: {
          _id: '$transaction.response.http_code',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    // Get top targeted URIs
    const topURIs = await collection.aggregate([
      {
        $group: {
          _id: '$transaction.request.uri',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]).toArray();

    // Calculate total blocked rate (all attacks are blocked with 403)
    const totalAttacks = await collection.countDocuments();
    const blockedAttacks = await collection.countDocuments({
      'transaction.response.http_code': 403
    });

    const blockRate = totalAttacks > 0 ? ((blockedAttacks / totalAttacks) * 100).toFixed(1) : 100;

    console.log('Additional Stats API:', {
      severityCount: formattedSeverity.length,
      methodsCount: methodsData.length,
      blockRate
    });

    return NextResponse.json({
      success: true,
      data: {
        severity: formattedSeverity,
        methods: methodsData,
        responseCodes: responseCodesData,
        topURIs: topURIs,
        blockRate: parseFloat(blockRate),
        totalAttacks,
        blockedAttacks
      }
    });
  } catch (error) {
    console.error('Additional Stats API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch additional stats',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
