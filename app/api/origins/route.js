import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getAuthenticatedUser, handleApiError } from '@/lib/auth';

function classifyIP(ip) {
  if (!ip || ip === 'Unknown') return { type: 'Unknown', label: 'Unknown', color: 'gray' };
  if (ip === '127.0.0.1' || ip === '::1') return { type: 'Localhost', label: 'Localhost', color: 'blue' };
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)
  ) return { type: 'Private', label: 'Private Network (RFC 1918)', color: 'purple' };
  return { type: 'External', label: 'External / Internet', color: 'orange' };
}

function threatLevel(attackCount, benignCount) {
  if (attackCount === 0) return 'none';
  const ratio = attackCount / (attackCount + benignCount);
  if (ratio >= 0.5) return 'high';
  if (ratio >= 0.1) return 'medium';
  return 'low';
}

export async function GET() {
  try {
    await getAuthenticatedUser();
    const client = await clientPromise;
    const db = client.db('waf_db');

    const attacksCol = db.collection('attacks');
    const mlBlockedCol = db.collection('ml_blocked_requests');
    const mlAllowedCol = db.collection('ml_allowed_requests');

    // Aggregate counts per IP from each collection in parallel
    const [atkAgg, mlbAgg, mlaAgg] = await Promise.all([
      attacksCol.aggregate([
        {
          $group: {
            _id: '$transaction.client_ip',
            count: { $sum: 1 },
            firstSeen: { $min: '$shipped_at' },
            lastSeen: { $max: '$shipped_at' },
            methods: { $addToSet: '$transaction.request.method' },
          },
        },
      ]).toArray(),
      mlBlockedCol.aggregate([
        {
          $group: {
            _id: '$source_ip',
            count: { $sum: 1 },
            firstSeen: { $min: '$timestamp' },
            lastSeen: { $max: '$timestamp' },
            attackTypes: { $addToSet: '$attack_type' },
          },
        },
      ]).toArray(),
      mlAllowedCol.aggregate([
        {
          $group: {
            _id: '$source_ip',
            count: { $sum: 1 },
            firstSeen: { $min: '$timestamp' },
            lastSeen: { $max: '$timestamp' },
          },
        },
      ]).toArray(),
    ]);

    // Build unified IP map
    const ipMap = {};

    const ensure = (ip) => {
      if (!ip) return null;
      if (!ipMap[ip]) {
        ipMap[ip] = {
          ip,
          atkCount: 0,
          mlbCount: 0,
          mlaCount: 0,
          firstSeen: null,
          lastSeen: null,
          methods: new Set(),
          attackTypes: new Set(),
        };
      }
      return ipMap[ip];
    };

    for (const r of atkAgg) {
      const e = ensure(r._id);
      if (!e) continue;
      e.atkCount += r.count;
      if (r.firstSeen && (!e.firstSeen || r.firstSeen < e.firstSeen)) e.firstSeen = r.firstSeen;
      if (r.lastSeen && (!e.lastSeen || r.lastSeen > e.lastSeen)) e.lastSeen = r.lastSeen;
      (r.methods || []).forEach(m => m && e.methods.add(m));
    }

    for (const r of mlbAgg) {
      const e = ensure(r._id);
      if (!e) continue;
      e.mlbCount += r.count;
      if (r.firstSeen && (!e.firstSeen || r.firstSeen < e.firstSeen)) e.firstSeen = r.firstSeen;
      if (r.lastSeen && (!e.lastSeen || r.lastSeen > e.lastSeen)) e.lastSeen = r.lastSeen;
      (r.attackTypes || []).forEach(t => t && e.attackTypes.add(t));
    }

    for (const r of mlaAgg) {
      const e = ensure(r._id);
      if (!e) continue;
      e.mlaCount += r.count;
      if (r.firstSeen && (!e.firstSeen || r.firstSeen < e.firstSeen)) e.firstSeen = r.firstSeen;
      if (r.lastSeen && (!e.lastSeen || r.lastSeen > e.lastSeen)) e.lastSeen = r.lastSeen;
    }

    // Build final IP list
    const ipList = Object.values(ipMap).map((e) => {
      const totalRequests = e.atkCount + e.mlbCount + e.mlaCount;
      const attackRequests = e.atkCount + e.mlbCount;
      const classification = classifyIP(e.ip);
      return {
        ip: e.ip,
        classification: classification.type,
        classificationLabel: classification.label,
        classificationColor: classification.color,
        totalRequests,
        attackRequests,
        benignRequests: e.mlaCount,
        modsecBlocked: e.atkCount,
        mlBlocked: e.mlbCount,
        threatLevel: threatLevel(attackRequests, e.mlaCount),
        methods: [...e.methods].filter(Boolean).sort(),
        attackTypes: [...e.attackTypes].filter(Boolean).sort(),
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
      };
    });

    // Sort by total requests descending
    ipList.sort((a, b) => b.totalRequests - a.totalRequests);

    // Summary stats
    const totalUniqueIPs = ipList.length;
    const maliciousIPs = ipList.filter(ip => ip.attackRequests > 0).length;
    const pureNormalIPs = ipList.filter(ip => ip.attackRequests === 0).length;
    const mixedIPs = ipList.filter(ip => ip.attackRequests > 0 && ip.benignRequests > 0).length;

    // Network breakdown
    const networkBreakdown = {
      localhost: ipList.filter(ip => ip.classification === 'Localhost').length,
      private: ipList.filter(ip => ip.classification === 'Private').length,
      external: ipList.filter(ip => ip.classification === 'External').length,
      unknown: ipList.filter(ip => ip.classification === 'Unknown').length,
    };

    // Traffic totals
    const totalTraffic = ipList.reduce((s, ip) => s + ip.totalRequests, 0);
    const totalAttackTraffic = ipList.reduce((s, ip) => s + ip.attackRequests, 0);
    const totalBenignTraffic = ipList.reduce((s, ip) => s + ip.benignRequests, 0);

    return NextResponse.json({
      success: true,
      data: {
        ipList,
        summary: {
          totalUniqueIPs,
          maliciousIPs,
          pureNormalIPs,
          mixedIPs,
          totalTraffic,
          totalAttackTraffic,
          totalBenignTraffic,
          networkBreakdown,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
