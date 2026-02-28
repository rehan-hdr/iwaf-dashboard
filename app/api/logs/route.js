import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

// Map ModSec tags to human-readable attack types
function getAttackType(tags) {
  if (!tags || !Array.isArray(tags)) return 'Unknown';
  const tagMap = {
    'attack-sqli': 'SQL Injection',
    'attack-xss': 'XSS',
    'attack-lfi': 'Local File Inclusion',
    'attack-rce': 'Remote Code Execution',
    'attack-rfi': 'Remote File Inclusion',
    'attack-protocol': 'Protocol Attack',
    'attack-generic': 'Generic Attack',
    'attack-injection-php': 'PHP Injection',
  };
  for (const tag of tags) {
    if (tagMap[tag]) return tagMap[tag];
  }
  return 'Other';
}

// Map numeric severity to label
function getSeverityLabel(severity) {
  const map = {
    0: 'Critical',
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Medium',
    5: 'Low',
  };
  return map[severity] ?? 'Low';
}

export async function GET(request) {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');
    const collection = db.collection('attacks');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '8', 10);
    const severity = searchParams.get('severity') || 'All';
    const attackType = searchParams.get('attackType') || 'All';
    const search = searchParams.get('search') || '';

    // Build MongoDB filter — only include docs that have messages (real attacks)
    const filter = {
      'transaction.messages': { $exists: true, $not: { $size: 0 } },
    };

    if (search) {
      // Escape special regex characters to prevent injection
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { 'transaction.client_ip': { $regex: escaped, $options: 'i' } },
        { 'transaction.request.uri': { $regex: escaped, $options: 'i' } },
      ];
    }

    // Fetch all matching docs (we need to filter by derived fields in JS)
    const allDocs = await collection
      .find(filter)
      .sort({ shipped_at: -1 })
      .toArray();

    // Transform documents to log entries
    const logs = allDocs.map((doc, index) => {
      const msg = doc.transaction?.messages?.[0];
      const tags = msg?.details?.tags || [];
      const type = getAttackType(tags);
      const sev = getSeverityLabel(msg?.details?.severity);
      const allPayloads = (doc.transaction?.messages || [])
        .map((m) => `[Rule ${m.details?.ruleId}] ${m.message}\nMatched: ${m.details?.data || 'N/A'}`)
        .join('\n\n');

      return {
        id: `ATK-${String(index + 1).padStart(3, '0')}`,
        timestamp: doc.shipped_at || doc.attack_details?.timestamp || '',
        clientIp: doc.transaction?.client_ip || doc.attack_details?.client_ip || 'Unknown',
        method: doc.transaction?.request?.method || doc.attack_details?.method || 'GET',
        uri: doc.transaction?.request?.uri || doc.attack_details?.uri || '/',
        attackType: type,
        severity: sev,
        ruleId: msg?.details?.ruleId || 'N/A',
        action: [400, 403].includes(doc.transaction?.response?.http_code) ? 'Blocked' : 'Logged',
        httpCode: doc.transaction?.response?.http_code || doc.attack_details?.http_code || 200,
        payload: allPayloads || 'No payload data',
        anomalyScore: doc.attack_details?.anomaly_score || 0,
        messageCount: doc.transaction?.messages?.length || 0,
      };
    });

    // Apply JS-side filters for derived fields
    let filtered = logs;
    if (severity !== 'All') {
      filtered = filtered.filter((l) => l.severity === severity);
    }
    if (attackType !== 'All') {
      filtered = filtered.filter((l) => l.attackType === attackType);
    }

    // Compute unique attack types and severities for filter dropdowns
    const allTypes = [...new Set(logs.map((l) => l.attackType))].sort();
    const allSeverities = ['Critical', 'High', 'Medium', 'Low'];

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      success: true,
      data: {
        logs: paginated,
        total,
        totalPages,
        currentPage: page,
        perPage,
        attackTypes: allTypes,
        severities: allSeverities,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
