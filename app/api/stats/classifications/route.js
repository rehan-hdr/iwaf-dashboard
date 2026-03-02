import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

export async function GET(request) {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'modsecurity';

    // ML Blocked classifications
    if (source === 'ml_blocked') {
      const mlCol = db.collection('ml_blocked_requests');
      const mlClassifications = await mlCol.aggregate([
        { $group: { _id: '$attack_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray();

      const mlTypeMap = {
        'sqli': { name: 'SQL Injection (ML)', color: '#3B82F6' },
        'xss': { name: 'XSS (Cross-Site Scripting) (ML)', color: '#FF7A50' },
        'lfi': { name: 'Local File Inclusion (ML)', color: '#10B981' },
        'rce': { name: 'Remote Code Execution (ML)', color: '#EF4444' },
        'rfi': { name: 'Remote File Inclusion (ML)', color: '#F59E0B' },
        'probe': { name: 'Probe / Scan (ML)', color: '#8B5CF6' },
        'benign': { name: 'Benign', color: '#22C55E' },
      };

      // Build map from DB results
      const dbMap = {};
      for (const item of mlClassifications) {
        dbMap[item._id] = item.count;
      }

      // Always include all known ML attack types, even with 0 count
      const knownAttackTypes = ['sqli', 'xss', 'lfi', 'probe'];
      const formatted = knownAttackTypes.map(type => ({
        type,
        name: mlTypeMap[type]?.name || type,
        count: dbMap[type] || 0,
        color: mlTypeMap[type]?.color || '#6B7280',
      }));
      // Also include any unexpected types from DB that aren't in the known list
      for (const item of mlClassifications) {
        if (!knownAttackTypes.includes(item._id) && item._id !== 'benign') {
          formatted.push({
            type: item._id,
            name: mlTypeMap[item._id]?.name || item._id,
            count: item.count,
            color: mlTypeMap[item._id]?.color || '#6B7280',
          });
        }
      }

      const total = formatted.reduce((sum, item) => sum + item.count, 0);
      const withPercentage = formatted.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : 0,
      }));

      return NextResponse.json({
        success: true,
        data: { classifications: withPercentage, total },
      });
    }

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
    return handleApiError(error);
  }
}
