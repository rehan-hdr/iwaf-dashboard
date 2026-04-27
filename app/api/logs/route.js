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

// Map ML confidence to severity
function getMLSeverity(confidence) {
  if (confidence >= 0.95) return 'Critical';
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.7) return 'Medium';
  return 'Low';
}

// Map ML labels to human-readable names
function capitalizeLabel(label) {
  if (!label) return 'Unknown';
  const map = {
    'sqli': 'SQL Injection',
    'xss': 'XSS',
    'lfi': 'Local File Inclusion',
    'rce': 'Remote Code Execution',
    'rfi': 'Remote File Inclusion',
    'probe': 'Probe / Scan',
    'benign': 'Benign',
  };
  return map[label.toLowerCase()] || label.charAt(0).toUpperCase() + label.slice(1);
}

// Handle ML collection logs (ml_blocked_requests / ml_allowed_requests)
async function handleMlLogs(db, source, search, attackType, page, perPage) {
  const collectionName = source === 'ml_blocked' ? 'ml_blocked_requests' : 'ml_allowed_requests';
  const collection = db.collection(collectionName);
  const prefix = source === 'ml_blocked' ? 'MLB' : 'MLA';

  const filter = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { 'source_ip': { $regex: escaped, $options: 'i' } },
      { 'request.path': { $regex: escaped, $options: 'i' } },
      { 'request.url': { $regex: escaped, $options: 'i' } },
    ];
  }

  const allDocs = await collection.find(filter).sort({ timestamp: -1 }).toArray();

  const logs = allDocs.map((doc, index) => ({
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    timestamp: doc.timestamp || '',
    clientIp: doc.source_ip || 'Unknown',
    method: doc.request?.method || 'GET',
    uri: doc.request?.path || '/',
    url: doc.request?.url || '',
    attackType: capitalizeLabel(doc.prediction?.label || doc.attack_type || 'unknown'),
    confidence: doc.prediction?.confidence || 0,
    severity: getMLSeverity(doc.prediction?.confidence || 0),
    action: source === 'ml_blocked' ? 'Blocked' : 'Allowed',
    payload: `URL: ${doc.request?.url || 'N/A'}\nQuery String: ${doc.request?.query_string || 'N/A'}\nBody: ${doc.request?.body || 'N/A'}\nUser-Agent: ${doc.request?.user_agent || 'N/A'}`,
    probabilities: doc.prediction?.probabilities || {},
    whitelisted: doc.whitelisted || false,
    blockedBy: doc.blocked_by || (source === 'ml_blocked' ? 'ml_layer' : 'N/A'),
    source: source,
  }));

  let filtered = logs;
  if (attackType !== 'All') {
    filtered = filtered.filter((l) => l.attackType === attackType);
  }

  // For ml_blocked, always include all known attack types (no Benign). For ml_allowed, no filter needed.
  const knownBlockedTypes = ['Local File Inclusion', 'Probe / Scan', 'SQL Injection', 'XSS'];
  const baseTypes = source === 'ml_blocked' ? knownBlockedTypes : [];
  const allTypes = [...new Set([...baseTypes, ...logs.map((l) => l.attackType)])].sort();
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
      severities: ['Critical', 'High', 'Medium', 'Low'],
      source,
    },
  });
}

export async function GET(request) {
  try {
    const { role } = await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'modsecurity';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '8', 10);
    const severity = searchParams.get('severity') || 'All';
    const attackType = searchParams.get('attackType') || 'All';
    const search = searchParams.get('search') || '';

    // Handle ML sources
    if (source === 'ml_blocked' || source === 'ml_allowed') {
      return handleMlLogs(db, source, search, attackType, page, perPage);
    }

    // Default: ModSecurity (attacks collection)
    const collection = db.collection('attacks');

    // Build MongoDB filter — only include docs that have messages (real attacks)
    const filter = {
      'transaction.messages': { $exists: true, $not: { $size: 0 } },
    };

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { 'transaction.client_ip': { $regex: escaped, $options: 'i' } },
        { 'transaction.request.uri': { $regex: escaped, $options: 'i' } },
      ];
    }

    const MODSEC_LIMIT = 2000;
    const allDocs = await collection
      .find(filter)
      .sort({ shipped_at: -1 })
      .limit(MODSEC_LIMIT)
      .allowDiskUse(true)
      .project({
        'transaction.client_ip': 1,
        'transaction.request.method': 1,
        'transaction.request.uri': 1,
        'transaction.response.http_code': 1,
        'transaction.messages': 1,
        'attack_details.anomaly_score': 1,
        'attack_details.timestamp': 1,
        'shipped_at': 1,
      })
      .toArray();

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
        source: 'modsecurity',
      };
    });

    let filtered = logs;
    if (severity !== 'All') {
      filtered = filtered.filter((l) => l.severity === severity);
    }
    if (attackType !== 'All') {
      filtered = filtered.filter((l) => l.attackType === attackType);
    }

    const allTypes = [...new Set(logs.map((l) => l.attackType))].sort();
    const allSeverities = ['Critical', 'High', 'Medium', 'Low'];

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
        source: 'modsecurity',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
