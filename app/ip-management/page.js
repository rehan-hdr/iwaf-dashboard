'use client';

import { useState, useEffect, useCallback } from 'react';

export default function IpManagementPage() {
  const [activeIps, setActiveIps] = useState([]);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState(null);
  const [togglingIp, setTogglingIp] = useState(null);

  const fetchActiveIps = useCallback(async () => {
    setIpsLoading(true);
    setIpsError(null);
    try {
      const res = await fetch('/api/ips');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load IPs');
      setActiveIps(data.ips);
    } catch (err) {
      setIpsError(err.message);
    } finally {
      setIpsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveIps();
  }, [fetchActiveIps]);

  const handleToggleBlock = async (ip, currentBlocked) => {
    setTogglingIp(ip);
    const newBlocked = !currentBlocked;
    try {
      const res = await fetch('/api/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, blocked: newBlocked }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Update failed');
      setActiveIps((prev) =>
        prev.map((entry) =>
          entry.ip === ip ? { ...entry, blocked: newBlocked } : entry
        )
      );
    } catch (err) {
      setIpsError(err.message);
    } finally {
      setTogglingIp(null);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">IP Management</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">Live view of all IPs making requests. Toggle to block or allow each IP.</p>

      {
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              IPs Making Requests
            </h2>
            <button
              onClick={fetchActiveIps}
              disabled={ipsLoading}
              className="text-xs text-[#FF7A50] hover:text-orange-600 font-medium disabled:opacity-50"
            >
              {ipsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {ipsError && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {ipsError}
            </div>
          )}

          {ipsLoading && !activeIps.length ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading IPs…</div>
          ) : activeIps.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No IPs found in request logs.</div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="block sm:hidden divide-y divide-gray-100">
                {activeIps.map((entry) => (
                  <div key={entry.ip} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm text-gray-800">{entry.ip}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {entry.requestCount.toLocaleString()} request{entry.requestCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.blocked && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Blocked
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleBlock(entry.ip, entry.blocked)}
                        disabled={togglingIp === entry.ip}
                        aria-label={entry.blocked ? 'Unblock IP' : 'Block IP'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#FF7A50] disabled:opacity-50 ${
                          entry.blocked ? 'bg-red-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            entry.blocked ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Requests</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeIps.map((entry) => (
                      <tr key={entry.ip} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-sm text-gray-800">{entry.ip}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.requestCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {entry.blocked ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Blocked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Allowed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleBlock(entry.ip, entry.blocked)}
                            disabled={togglingIp === entry.ip}
                            aria-label={entry.blocked ? 'Unblock IP' : 'Block IP'}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#FF7A50] disabled:opacity-50 ${
                              entry.blocked ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                entry.blocked ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      }
    </div>
  );
}
