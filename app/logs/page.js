'use client';

import { useState, useEffect, Fragment } from 'react';

export default function LogsPage() {
  const [allLogs, setAllLogs] = useState([]);
  const [allAttackTypes, setAllAttackTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  // Fetch ALL logs once on mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs?perPage=9999');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const json = await res.json();
        setAllLogs(json.data.logs);
        setAllAttackTypes(json.data.attackTypes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Client-side filtering
  const filtered = allLogs.filter((log) => {
    const matchesSearch =
      !search ||
      log.clientIp.toLowerCase().includes(search.toLowerCase()) ||
      log.uri.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter;
    const matchesType = typeFilter === 'All' || log.attackType === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const attackTypes = ['All', ...allAttackTypes];

  const severityColor = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800',
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Attack Logs</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Data
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-4 sm:mb-6">Real-time view of detected attacks and blocked requests from MongoDB</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Search by IP or URI..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
        />
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
        >
          {severities.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Severities' : s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
        >
          <option value="All">All Types</option>
          {allAttackTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A50]"></div>
          <span className="ml-3 text-gray-500">Loading logs...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile card view */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {paginated.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-500">{log.id}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${severityColor[log.severity]}`}>
                    {log.severity}
                  </span>
                </div>
                <div className="text-sm font-mono text-gray-800 mb-1">{log.clientIp}</div>
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mr-2">{log.method}</span>
                  <span className="font-mono truncate">{log.uri}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">{log.attackType}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${log.action === 'Blocked' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {log.action}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                </div>
                <button
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  className="text-xs text-[#FF7A50] mt-2 underline"
                >
                  {expandedRow === log.id ? 'Hide details' : 'Show details'}
                </button>
                {expandedRow === log.id && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="text-gray-600">
                      <span className="font-medium">Rule:</span> {log.ruleId}
                      <span className="mx-2">|</span>
                      <span className="font-medium">HTTP:</span> {log.httpCode}
                      <span className="mx-2">|</span>
                      <span className="font-medium">Score:</span> {log.anomalyScore}
                      <span className="mx-2">|</span>
                      <span className="font-medium">Alerts:</span> {log.messageCount}
                    </div>
                    <pre className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                      {log.payload}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client IP</th>
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">URI</th>
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attack Type</th>
                  <th className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <td className="px-3 lg:px-4 py-3 text-sm font-mono text-gray-600">{log.id}</td>
                      <td className="px-3 lg:px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-sm font-mono text-gray-800">{log.clientIp}</td>
                      <td className="px-3 lg:px-4 py-3">
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {log.method}
                        </span>
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-sm font-mono text-gray-600 max-w-[200px] truncate">
                        {log.uri}
                      </td>
                      <td className="px-3 lg:px-4 py-3 text-sm text-gray-800">{log.attackType}</td>
                      <td className="px-3 lg:px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${severityColor[log.severity]}`}>
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr>
                        <td colSpan={7} className="px-3 lg:px-4 py-4 bg-gray-50">
                          <div className="text-sm flex flex-wrap gap-x-6 gap-y-1">
                            <div>
                              <span className="font-medium text-gray-700">Rule ID:</span>{' '}
                              <span className="font-mono text-gray-600">{log.ruleId}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">HTTP Code:</span>{' '}
                              <span className="font-mono text-gray-600">{log.httpCode}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Anomaly Score:</span>{' '}
                              <span className="font-mono text-gray-600">{log.anomalyScore}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Alert Count:</span>{' '}
                              <span className="font-mono text-gray-600">{log.messageCount}</span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="font-medium text-gray-700 text-sm">Rule Details & Matched Data:</span>
                            <pre className="mt-1 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                              {log.payload}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
