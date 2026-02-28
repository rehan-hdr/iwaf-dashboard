import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    // Aggregate attack classifications by rule tags
    const classifications = await collection.aggregate([
      {
        $unwind: '$transaction.messages'
      },
      {
        $unwind: '$transaction.messages.details.tags'
      },
      {
        $match: {
          'transaction.messages.details.tags': {
            $regex: '^attack-',
            $options: 'i'
          }
        }
      },
      {
        $group: {
          _id: '$transaction.messages.details.tags',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    // Map attack types to friendly names
    const attackTypeMap = {
      'attack-xss': { name: 'XSS (Cross-Site Scripting)', color: '#FF7A50' },
      'attack-sqli': { name: 'SQL Injection', color: '#3B82F6' },
      'attack-lfi': { name: 'Local File Inclusion', color: '#10B981' },
      'attack-rfi': { name: 'Remote File Inclusion', color: '#F59E0B' },
      'attack-rce': { name: 'Remote Code Execution', color: '#EF4444' },
      'attack-protocol': { name: 'Protocol Attack', color: '#8B5CF6' },
      'attack-generic': { name: 'Generic Attack', color: '#6B7280' },
      'attack-injection': { name: 'Code Injection', color: '#EC4899' }
    };

    const formattedClassifications = classifications
      .filter(item => attackTypeMap[item._id])
      .map(item => ({
        type: item._id,
        name: attackTypeMap[item._id]?.name || item._id,
        count: item.count,
        color: attackTypeMap[item._id]?.color || '#6B7280'
      }));

    // Calculate total for percentages
    const total = formattedClassifications.reduce((sum, item) => sum + item.count, 0);
    
    const classificationsWithPercentage = formattedClassifications.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : 0
    }));

    console.log('Attack Classifications API:', classificationsWithPercentage);

    return NextResponse.json({
      success: true,
      data: {
        classifications: classificationsWithPercentage,
        total
      }
    });
  } catch (error) {
    console.error('Attack Classifications API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch attack classifications',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
