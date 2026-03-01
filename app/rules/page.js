'use client';

import { useState } from 'react';
import { MODSEC_RULES } from '@/lib/mockData';

export default function RulesPage() {
  const [rules, setRules] = useState(MODSEC_RULES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...new Set(MODSEC_RULES.map((r) => r.category))];

  const filtered = rules.filter((rule) => {
    const matchesSearch =
      rule.id.includes(search) ||
      rule.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || rule.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const toggleRule = (id) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const severityColor = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800',
  };

  // Category breakdown
  const categoryStats = categories
    .filter((c) => c !== 'All')
    .map((cat) => {
      const catRules = rules.filter((r) => r.category === cat);
      const totalTriggers = catRules.reduce((sum, r) => sum + r.triggers, 0);
      const enabledCount = catRules.filter((r) => r.enabled).length;
      return { category: cat, total: catRules.length, enabled: enabledCount, triggers: totalTriggers };
    })
    .sort((a, b) => b.triggers - a.triggers);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rule Management</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          Hardcoded Data
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-1">Configure ModSecurity CRS rules and custom rules</p>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg mb-4 sm:mb-6">
        <strong>Note:</strong> Rule table data (IDs, names, trigger counts, enabled status) is static sample data. Toggle changes are not persisted.
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {categoryStats.map((stat) => (
          <div
            key={stat.category}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 cursor-pointer hover:border-[#FF7A50] transition-colors"
            onClick={() => setCategoryFilter(stat.category === categoryFilter ? 'All' : stat.category)}
          >
            <div className="text-xs font-medium text-gray-500 uppercase">{stat.category}</div>
            <div className="text-lg sm:text-xl font-bold text-gray-800 mt-1">{stat.triggers.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stat.enabled}/{stat.total} rules active
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Search by rule ID or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A50] focus:border-transparent outline-none text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {/* Rules — Mobile card view + Desktop table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile card view */}
        <div className="block sm:hidden divide-y divide-gray-100">
          {filtered.map((rule) => (
            <div key={rule.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      rule.enabled ? 'bg-[#FF7A50]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        rule.enabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span className="font-mono text-sm text-gray-800">{rule.id}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${severityColor[rule.severity]}`}>
                  {rule.severity}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">{rule.name}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {rule.category}
                </span>
                <span className="text-sm font-medium text-gray-800">{rule.triggers.toLocaleString()} triggers</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rule ID</th>
                <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase">Triggers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((rule) => (
                <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.enabled ? 'opacity-50' : ''}`}>
                  <td className="px-4 lg:px-6 py-4">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        rule.enabled ? 'bg-[#FF7A50]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          rule.enabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 lg:px-6 py-4 font-mono text-sm text-gray-800">{rule.id}</td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-700 max-w-[300px]">{rule.name}</td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {rule.category}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${severityColor[rule.severity]}`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm font-medium text-gray-800">
                    {rule.triggers.toLocaleString()}
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
