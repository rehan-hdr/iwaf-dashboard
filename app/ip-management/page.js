'use client';

import { useState } from 'react';
import { BLOCKLIST, WHITELIST } from '@/lib/mockData';

export default function IpManagementPage() {
  const [activeTab, setActiveTab] = useState('blocklist');
  const [blocklist, setBlocklist] = useState(BLOCKLIST);
  const [whitelist, setWhitelist] = useState(WHITELIST);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newIp) return;

    const entry = {
      ip: newIp,
      reason: newReason || 'Manually added',
      addedAt: new Date().toISOString(),
      ...(activeTab === 'blocklist' ? { hits: 0 } : {}),
    };

    if (activeTab === 'blocklist') {
      setBlocklist([entry, ...blocklist]);
    } else {
      setWhitelist([entry, ...whitelist]);
    }
    setNewIp('');
    setNewReason('');
  };

  const handleRemove = (ip) => {
    if (activeTab === 'blocklist') {
      setBlocklist(blocklist.filter((item) => item.ip !== ip));
    } else {
      setWhitelist(whitelist.filter((item) => item.ip !== ip));
    }
  };

  const currentList = activeTab === 'blocklist' ? blocklist : whitelist;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">IP Management</h1>
      <p className="text-gray-500 mb-6">Manage blocked and whitelisted IP addresses</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('blocklist')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'blocklist'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Blocklist ({blocklist.length})
        </button>
        <button
          onClick={() => setActiveTab('whitelist')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'whitelist'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Whitelist ({whitelist.length})
        </button>
      </div>

      {/* Add IP Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Add to {activeTab === 'blocklist' ? 'Blocklist' : 'Whitelist'}
        </h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="e.g. 192.168.1.100"
              required
              pattern="^(\d{1,3}\.){3}\d{1,3}$"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Reason for adding"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none"
            />
          </div>
          <button
            type="submit"
            className={`px-6 py-2 text-white rounded-lg transition-colors ${
              activeTab === 'blocklist'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Add IP
          </button>
        </form>
      </div>

      {/* IP Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
                {activeTab === 'blocklist' && (
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Hits</th>
                )}
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentList.map((item) => (
                <tr key={item.ip} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-800">{item.ip}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.addedAt).toLocaleDateString()}
                  </td>
                  {activeTab === 'blocklist' && (
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-red-600">{item.hits}</span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleRemove(item.ip)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
