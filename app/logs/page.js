'use client';

import { useState } from 'react';
import { ATTACK_LOGS } from '@/lib/mockData';

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const attackTypes = ['All', ...new Set(ATTACK_LOGS.map((l) => l.attackType))];

  const filtered = ATTACK_LOGS.filter((log) => {
    const matchesSearch =
      log.clientIp.includes(search) ||
      log.uri.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter;
    const matchesType = typeFilter === 'All' || log.attackType === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const severityColor = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Attack Logs</h1>
      <p className="text-gray-500 mb-6">Real-time view of detected attacks and blocked requests</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by IP, URI, or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none w-72"
        />
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
        >
          {severities.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Severities' : s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
        >
          {attackTypes.map((t) => (
            <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client IP</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">URI</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attack Type</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{log.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-800">{log.clientIp}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 max-w-[200px] truncate">
                      {log.uri}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{log.attackType}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${severityColor[log.severity]}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        log.action === 'Blocked' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr key={`${log.id}-detail`}>
                      <td colSpan={8} className="px-4 py-4 bg-gray-50">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Rule ID:</span>{' '}
                          <span className="font-mono text-gray-600">{log.ruleId}</span>
                          <span className="mx-4 font-medium text-gray-700">HTTP Code:</span>{' '}
                          <span className="font-mono text-gray-600">{log.httpCode}</span>
                        </div>
                        <div className="mt-2">
                          <span className="font-medium text-gray-700">Raw Payload:</span>
                          <pre className="mt-1 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                            {log.payload}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}
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
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
