'use client';

import { useState, useEffect } from 'react';

const THREAT_COLORS = {
  high:   { badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    label: 'High' },
  medium: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',  label: 'Medium' },
  low:    { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', label: 'Low' },
  none:   { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500',  label: 'None' },
};

const CLASS_COLORS = {
  Localhost: 'bg-blue-100 text-blue-700',
  Private:   'bg-purple-100 text-purple-700',
  External:  'bg-orange-100 text-orange-700',
  Unknown:   'bg-gray-100 text-gray-600',
};

function fmt(n) { return (n || 0).toLocaleString(); }

function Bar({ value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

export default function OriginsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [threatFilter, setThreatFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [expandedIP, setExpandedIP] = useState(null);
  const [sortKey, setSortKey] = useState('totalRequests');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    fetch('/api/origins')
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error || 'Failed to load');
        setData(json.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#FF7A50] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A50]" />
      <span className="ml-3 text-gray-500">Analysing origins...</span>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
    </div>
  );

  const { ipList = [], summary = {} } = data || {};

  // Filter
  let filtered = ipList.filter(ip => {
    if (search && !ip.ip.toLowerCase().includes(search.toLowerCase())) return false;
    if (threatFilter !== 'all' && ip.threatLevel !== threatFilter) return false;
    if (classFilter !== 'all' && ip.classification !== classFilter) return false;
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const benignPct = summary.totalTraffic > 0
    ? ((summary.totalBenignTraffic / summary.totalTraffic) * 100).toFixed(1)
    : 0;
  const attackPct = summary.totalTraffic > 0
    ? ((summary.totalAttackTraffic / summary.totalTraffic) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Origins</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Data
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Analysis of all source IP addresses observed across ModSecurity, ML-Blocked, and Benign traffic layers.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Unique IPs</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(summary.totalUniqueIPs)}</div>
          <div className="text-xs text-gray-400 mt-1">Seen across all layers</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Attack IPs</div>
          <div className="text-2xl font-bold text-red-600">{fmt(summary.maliciousIPs)}</div>
          <div className="text-xs text-gray-400 mt-1">{fmt(summary.mixedIPs)} also had benign traffic</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Pure Benign IPs</div>
          <div className="text-2xl font-bold text-green-600">{fmt(summary.pureNormalIPs)}</div>
          <div className="text-xs text-gray-400 mt-1">No attack traffic ever</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(summary.totalTraffic)}</div>
          <div className="text-xs text-gray-400 mt-1">{attackPct}% attack · {benignPct}% benign</div>
        </div>
      </div>

      {/* Traffic Split + Network Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Traffic split */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Traffic Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  Attack Traffic
                </span>
                <span className="font-semibold text-red-600">{fmt(summary.totalAttackTraffic)}</span>
              </div>
              <Bar value={summary.totalAttackTraffic} total={summary.totalTraffic} color="bg-red-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  Benign Traffic
                </span>
                <span className="font-semibold text-green-600">{fmt(summary.totalBenignTraffic)}</span>
              </div>
              <Bar value={summary.totalBenignTraffic} total={summary.totalTraffic} color="bg-green-500" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div>ModSec blocked: <span className="font-medium text-gray-700">{fmt(ipList.reduce((s, ip) => s + ip.modsecBlocked, 0))}</span></div>
            <div>ML blocked: <span className="font-medium text-gray-700">{fmt(ipList.reduce((s, ip) => s + ip.mlBlocked, 0))}</span></div>
          </div>
        </div>

        {/* Network breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Network Origin Breakdown</h3>
          <div className="space-y-3">
            {[
              { key: 'localhost', label: 'Localhost (127.0.0.1 / ::1)', color: 'bg-blue-500', badgeColor: 'bg-blue-100 text-blue-700' },
              { key: 'private',   label: 'Private Network (RFC 1918)', color: 'bg-purple-500', badgeColor: 'bg-purple-100 text-purple-700' },
              { key: 'external',  label: 'External / Internet',         color: 'bg-orange-500', badgeColor: 'bg-orange-100 text-orange-700' },
              { key: 'unknown',   label: 'Unknown',                      color: 'bg-gray-400',   badgeColor: 'bg-gray-100 text-gray-600' },
            ].map(({ key, label, color, badgeColor }) => {
              const count = summary.networkBreakdown?.[key] || 0;
              const total = summary.totalUniqueIPs || 1;
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{count} IP{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
        />
        <select
          value={threatFilter}
          onChange={e => setThreatFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
        >
          <option value="all">All Threat Levels</option>
          <option value="high">High Threat</option>
          <option value="medium">Medium Threat</option>
          <option value="low">Low Threat</option>
          <option value="none">No Threat</option>
        </select>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
        >
          <option value="all">All Network Types</option>
          <option value="Localhost">Localhost</option>
          <option value="Private">Private Network</option>
          <option value="External">External</option>
        </select>
      </div>

      {/* IP Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  { key: 'ip',            label: 'IP Address' },
                  { key: 'classification',label: 'Network Type' },
                  { key: 'totalRequests', label: 'Total Requests' },
                  { key: 'attackRequests',label: 'Attack Requests' },
                  { key: 'benignRequests',label: 'Benign Requests' },
                  { key: 'threatLevel',   label: 'Threat Level' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-800 select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}<SortIcon k={col.key} />
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No IPs match your filters</td>
                </tr>
              )}
              {filtered.map((ip) => {
                const threat = THREAT_COLORS[ip.threatLevel] || THREAT_COLORS.none;
                const isExpanded = expandedIP === ip.ip;
                return (
                  <>
                    <tr
                      key={ip.ip}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedIP(isExpanded ? null : ip.ip)}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">{ip.ip}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CLASS_COLORS[ip.classification] || 'bg-gray-100 text-gray-600'}`}>
                          {ip.classification}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{fmt(ip.totalRequests)}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{fmt(ip.attackRequests)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{fmt(ip.benignRequests)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${threat.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${threat.dot}`} />
                          {threat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {ip.lastSeen ? new Date(ip.lastSeen).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${ip.ip}-detail`}>
                        <td colSpan={7} className="bg-gray-50 px-4 py-4 border-t border-gray-100">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Layer Breakdown</div>
                              <div className="space-y-1 text-gray-700">
                                <div>ModSec Blocked: <span className="font-semibold text-red-600">{fmt(ip.modsecBlocked)}</span></div>
                                <div>ML Blocked: <span className="font-semibold text-purple-600">{fmt(ip.mlBlocked)}</span></div>
                                <div>Benign (Passed): <span className="font-semibold text-green-600">{fmt(ip.benignRequests)}</span></div>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Network</div>
                              <div className="text-gray-700">{ip.classificationLabel}</div>
                              {ip.methods.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-400 mb-1">HTTP Methods:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {ip.methods.map(m => (
                                      <span key={m} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{m}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Attack Types (ML)</div>
                              {ip.attackTypes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {ip.attackTypes.map(t => (
                                    <span key={t} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-xs">{t}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">None detected via ML</span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 font-medium uppercase mb-1">Timeline</div>
                              <div className="space-y-1 text-xs text-gray-600">
                                <div>First seen: {ip.firstSeen ? new Date(ip.firstSeen).toLocaleString() : '—'}</div>
                                <div>Last seen: {ip.lastSeen ? new Date(ip.lastSeen).toLocaleString() : '—'}</div>
                              </div>
                            </div>
                          </div>
                          {/* Mini traffic bar */}
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500 mb-2">Traffic split for this IP</div>
                            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                              {ip.modsecBlocked > 0 && (
                                <div
                                  className="bg-red-500"
                                  style={{ width: `${(ip.modsecBlocked / ip.totalRequests) * 100}%` }}
                                  title={`ModSec: ${ip.modsecBlocked}`}
                                />
                              )}
                              {ip.mlBlocked > 0 && (
                                <div
                                  className="bg-purple-500"
                                  style={{ width: `${(ip.mlBlocked / ip.totalRequests) * 100}%` }}
                                  title={`ML Blocked: ${ip.mlBlocked}`}
                                />
                              )}
                              {ip.benignRequests > 0 && (
                                <div
                                  className="bg-green-500"
                                  style={{ width: `${(ip.benignRequests / ip.totalRequests) * 100}%` }}
                                  title={`Benign: ${ip.benignRequests}`}
                                />
                              )}
                            </div>
                            <div className="flex gap-4 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />ModSec</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />ML</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Benign</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card view */}
        <div className="block sm:hidden divide-y divide-gray-100">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No IPs match your filters</div>
          )}
          {filtered.map((ip) => {
            const threat = THREAT_COLORS[ip.threatLevel] || THREAT_COLORS.none;
            return (
              <div key={ip.ip} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-medium text-gray-800 text-sm">{ip.ip}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${threat.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${threat.dot}`} />
                    {threat.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CLASS_COLORS[ip.classification] || 'bg-gray-100 text-gray-600'}`}>
                    {ip.classification}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="font-bold text-gray-900">{fmt(ip.totalRequests)}</div>
                    <div className="text-gray-400">Total</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <div className="font-bold text-red-600">{fmt(ip.attackRequests)}</div>
                    <div className="text-gray-400">Attack</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="font-bold text-green-600">{fmt(ip.benignRequests)}</div>
                    <div className="text-gray-400">Benign</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          Showing {filtered.length} of {ipList.length} IP{ipList.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
