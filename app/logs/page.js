'use client';

import { useState, useEffect, Fragment } from 'react';

const SOURCE_TABS = [
  { key: 'modsecurity', label: 'ModSecurity Blocked', color: 'red' },
  { key: 'ml_blocked', label: 'ML Blocked', color: 'purple' },
  { key: 'ml_allowed', label: 'Benign', color: 'green' },
];

export default function LogsPage() {
  const [source, setSource] = useState('modsecurity');
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

  // Fetch logs when source changes
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      setExpandedRow(null);
      setCurrentPage(1);
      setSearch('');
      setSeverityFilter('All');
      setTypeFilter('All');
      try {
        const res = await fetch(`/api/logs?perPage=9999&source=${source}`);
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
  }, [source]);

  const handleSourceChange = (newSource) => {
    if (newSource !== source) setSource(newSource);
  };

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

  const isML = source === 'ml_blocked' || source === 'ml_allowed';

  // Table columns per source
  const modsecColumns = ['ID', 'Time', 'Client IP', 'Method', 'URI', 'Attack Type', 'Severity'];
  const mlColumns = ['ID', 'Time', 'Source IP', 'Method', 'Path', 'Prediction', 'Confidence'];
  const columns = isML ? mlColumns : modsecColumns;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Logs</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Data
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-1 sm:mb-2">
        View logs across all firewall layers — ModSecurity rule-based and ML-based detection
      </p>
      {source === 'modsecurity' && (
        <p className="text-xs text-gray-400 mb-4 sm:mb-6">
          Severity is based on ModSecurity rule severity: <span className="font-medium text-red-600">Critical</span> (Emergency / Alert, 0–1) · <span className="font-medium text-orange-600">High</span> (Critical, 2) · <span className="font-medium text-yellow-600">Medium</span> (Error / Warning, 3–4) · <span className="font-medium text-green-600">Low</span> (Notice, 5)
        </p>
      )}
      {source !== 'modsecurity' && <div className="mb-3 sm:mb-4" />}

      {/* Source Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap">
        {SOURCE_TABS.map((tab) => {
          const isActive = source === tab.key;
          const colorMap = {
            red: isActive ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-red-50',
            purple: isActive ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-purple-50',
            green: isActive ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-green-50',
          };
          return (
            <button
              key={tab.key}
              onClick={() => handleSourceChange(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${colorMap[tab.color]}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters — hidden for Benign tab */}
      {source !== 'ml_allowed' && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
          <input
            type="text"
            placeholder={isML ? 'Search by IP or path...' : 'Search by IP or URI...'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
          />
          {source === 'modsecurity' && (
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
            >
              {severities.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Severities' : s}</option>
              ))}
            </select>
          )}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
          >
            <option value="All">{source === 'ml_blocked' ? 'All Predictions' : 'All Types'}</option>
            {allAttackTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

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
            {paginated.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No logs found</div>
            )}
            {paginated.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-500">{log.id}</span>
                  {isML ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {(log.confidence * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${severityColor[log.severity]}`}>
                      {log.severity}
                    </span>
                  )}
                </div>
                <div className="text-sm font-mono text-gray-800 mb-1">{log.clientIp}</div>
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mr-2">{log.method}</span>
                  <span className="font-mono truncate">{log.uri}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">{log.attackType}</span>
                  {!isML && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      log.action === 'Blocked' ? 'bg-red-100 text-red-800' : 
                      log.action === 'Allowed' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  )}
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
                    {isML ? (
                      <div className="text-gray-600 space-y-1">
                        <div><span className="font-medium">Blocked By:</span> {log.blockedBy}</div>
                        <div><span className="font-medium">Confidence:</span> {(log.confidence * 100).toFixed(2)}%</div>
                        <div><span className="font-medium">Whitelisted:</span> {log.whitelisted ? 'Yes' : 'No'}</div>
                        {log.probabilities && Object.keys(log.probabilities).length > 0 && (
                          <div>
                            <span className="font-medium">Probabilities:</span>
                            <div className="mt-1 space-y-1">
                              {Object.entries(log.probabilities).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="w-12 text-right">{key}:</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${val * 100}%` }} />
                                  </div>
                                  <span className="w-14 text-right">{(val * 100).toFixed(2)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-600">
                        <span className="font-medium">Rule:</span> {log.ruleId}
                        <span className="mx-2">|</span>
                        <span className="font-medium">HTTP:</span> {log.httpCode}
                        <span className="mx-2">|</span>
                        <span className="font-medium">Score:</span> {log.anomalyScore}
                        <span className="mx-2">|</span>
                        <span className="font-medium">Alerts:</span> {log.messageCount}
                      </div>
                    )}
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
                  {columns.map((col) => (
                    <th key={col} className="px-3 lg:px-4 py-3 text-xs font-medium text-gray-500 uppercase">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 text-sm">No logs found</td>
                  </tr>
                )}
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
                      {isML ? (
                        <td className="px-3 lg:px-4 py-3">
                          <span className="text-xs font-medium px-2 py-1 rounded bg-purple-100 text-purple-800">
                            {(log.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                      ) : (
                        <td className="px-3 lg:px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${severityColor[log.severity]}`}>
                            {log.severity}
                          </span>
                        </td>
                      )}
                    </tr>
                    {expandedRow === log.id && (
                      <tr>
                        <td colSpan={columns.length} className="px-3 lg:px-4 py-4 bg-gray-50">
                          {isML ? (
                            <>
                              <div className="text-sm flex flex-wrap gap-x-6 gap-y-1 mb-3">
                                <div>
                                  <span className="font-medium text-gray-700">Blocked By:</span>{' '}
                                  <span className="font-mono text-gray-600">{log.blockedBy}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Confidence:</span>{' '}
                                  <span className="font-mono text-gray-600">{(log.confidence * 100).toFixed(2)}%</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Whitelisted:</span>{' '}
                                  <span className="font-mono text-gray-600">{log.whitelisted ? 'Yes' : 'No'}</span>
                                </div>
                              </div>
                              {log.probabilities && Object.keys(log.probabilities).length > 0 && (
                                <div className="mb-3">
                                  <span className="font-medium text-gray-700 text-sm">ML Probabilities:</span>
                                  <div className="mt-2 space-y-1.5 max-w-md">
                                    {Object.entries(log.probabilities).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                                      <div key={key} className="flex items-center gap-2 text-sm">
                                        <span className="w-16 text-right text-gray-600 capitalize">{key}</span>
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                          <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${val * 100}%` }} />
                                        </div>
                                        <span className="w-16 text-right text-gray-700 font-mono text-xs">{(val * 100).toFixed(2)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
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
                          )}
                          <div className="mt-2">
                            <span className="font-medium text-gray-700 text-sm">
                              {isML ? 'Request Details:' : 'Rule Details & Matched Data:'}
                            </span>
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
