'use client';

import { useState, useEffect } from 'react';

// ── Badge colour maps ─────────────────────────────────────────
const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-700',
  ERROR:    'bg-orange-100 text-orange-700',
  WARNING:  'bg-amber-100 text-amber-700',
  NOTICE:   'bg-blue-100 text-blue-700',
};

const CONFIDENCE_COLORS = {
  HIGH:   'bg-green-100 text-green-800',
  MEDIUM: 'bg-sky-100 text-sky-800',
  LOW:    'bg-red-100 text-red-800',
};

const FP_RISK_COLORS = {
  LOW:    'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH:   'bg-red-100 text-red-700',
};

const STATUS_COLORS = {
  pending_review: 'bg-indigo-100 text-indigo-700',
  approved:       'bg-green-100 text-green-800',
  rejected:       'bg-red-100 text-red-800',
};

const VERDICT_COLORS = {
  SAFE:       'bg-green-100 text-green-800',
  UNSAFE:     'bg-red-100 text-red-800',
  BORDERLINE: 'bg-amber-100 text-amber-800',
};

const ATTACK_TYPE_COLORS = {
  probe: 'bg-indigo-100 text-indigo-700',
  sqli:  'bg-red-100 text-red-800',
  xss:   'bg-orange-100 text-orange-800',
  lfi:   'bg-rose-100 text-rose-800',
  rce:   'bg-red-100 text-red-800',
};

function formatStatus(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RulesPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetch('/api/rules/suggestions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSuggestions(data.data);
        else setError(data.error || 'Failed to load suggestions');
      })
      .catch(() => setError('Network error — could not reach the server'))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="p-4 sm:p-6">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rule Management</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Data
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        ML-generated ModSecurity rules — automatically derived from clustered attack traffic and LLM-assisted analysis
      </p>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-4 border-[#FF7A50] border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Loading suggestions…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary stat cards */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                { label: 'Suggestions', value: suggestions.length, color: 'text-gray-800' },
                {
                  label: 'Pending Review',
                  value: suggestions.filter((s) => s.status === 'pending_review').length,
                  color: 'text-indigo-600',
                },
                {
                  label: 'Safe FP Verdict',
                  value: suggestions.filter((s) => s.fp_evaluation?.verdict === 'SAFE').length,
                  color: 'text-green-600',
                },
                {
                  label: 'Clustered Requests',
                  value: suggestions.reduce((n, s) => n + (s.cluster_size || 0), 0).toLocaleString(),
                  color: 'text-gray-800',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="text-xs text-gray-400 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestion cards */}
          <div className="space-y-3">
            {suggestions.map((s) => {
              const isExpanded = expandedId === s._id;
              const cs = s.cluster_summary;
              const fp = s.fp_evaluation;
              const llm = s.llm_analysis;

              return (
                <div
                  key={s._id}
                  className={`bg-white rounded-xl border transition-shadow ${
                    isExpanded ? 'border-gray-200 shadow-md' : 'border-gray-100 shadow-sm'
                  }`}
                >
                  {/* ── Collapsed row ── */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s._id)}
                    className="w-full text-left p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">

                      {/* Left: FP verdict indicator dot */}
                      <div className="mt-1 shrink-0">
                        <span
                          title={`FP Verdict: ${fp?.verdict || 'N/A'}`}
                          className={`block w-2.5 h-2.5 rounded-full mt-1 ${
                            fp?.verdict === 'SAFE'
                              ? 'bg-green-400'
                              : fp?.verdict === 'UNSAFE'
                              ? 'bg-red-400'
                              : 'bg-amber-400'
                          }`}
                        />
                      </div>

                      {/* Middle: rule info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            #{s.rule_id}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${ATTACK_TYPE_COLORS[s.attack_type] || 'bg-gray-100 text-gray-600'}`}>
                            {s.attack_type}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${SEVERITY_COLORS[s.severity] || 'bg-gray-100 text-gray-600'}`}>
                            {s.severity}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${FP_RISK_COLORS[s.llm_fp_risk] || 'bg-gray-100 text-gray-600'}`}>
                            FP {s.llm_fp_risk}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                            {formatStatus(s.status)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{s.technique_name}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.description}</p>
                      </div>

                      {/* Right: cluster size + chevron */}
                      <div className="shrink-0 flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-400">Cluster</div>
                          <div className="text-sm font-bold text-gray-700">{s.cluster_size}</div>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded panel ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">

                      {/* Description */}
                      <div className="px-5 py-4">
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-4 py-3">
                          {s.description}
                        </p>
                      </div>

                      {/* Overview metrics strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border-t border-b border-gray-100">
                        {[
                          ['Cluster', `#${s.cluster_id} · ${s.cluster_size} requests`],
                          ['Target', s.targets],
                          ['Confidence', s.confidence],
                          ['Analysed', s.analyzed_at
                            ? new Date(s.analyzed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'],
                        ].map(([label, val]) => (
                          <div key={label} className="bg-white px-4 py-3">
                            <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                            <div className="text-sm font-semibold text-gray-800 truncate">{val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Cluster analysis + FP evaluation */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-gray-100">

                        {/* Cluster analysis */}
                        <div className="px-5 py-4 lg:border-r border-gray-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cluster Analysis</p>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Attack Types</p>
                              {cs?.attack_distribution && Object.entries(cs.attack_distribution).map(([type, count]) => (
                                <div key={type} className="flex items-center gap-2 text-xs mb-1.5">
                                  <span className={`px-1.5 py-0.5 rounded font-medium capitalize ${ATTACK_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}>
                                    {type}
                                  </span>
                                  <span className="font-semibold text-gray-700">{count}</span>
                                </div>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-2">HTTP Methods</p>
                              {cs?.method_distribution && Object.entries(cs.method_distribution).map(([method, count]) => (
                                <div key={method} className="flex items-center gap-2 text-xs mb-1.5">
                                  <span className="font-mono bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">{method}</span>
                                  <span className="font-semibold text-gray-700">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {cs?.top_source_ips && (
                            <div className="mb-4">
                              <p className="text-xs text-gray-500 mb-2">
                                Source IPs
                                <span className="text-gray-400 ml-1">({cs.unique_ips} unique)</span>
                              </p>
                              {Object.entries(cs.top_source_ips).map(([ip, count]) => (
                                <div key={ip} className="flex items-center gap-2 text-xs mb-1.5">
                                  <span className="font-mono text-gray-600 w-24 truncate shrink-0">{ip}</span>
                                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                    <div
                                      className="bg-[#FF7A50] h-1.5 rounded-full"
                                      style={{ width: `${Math.min(100, (count / cs.cluster_size) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-gray-500 w-5 text-right shrink-0">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {cs?.sample_requests?.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Sample Requests</p>
                              <div className="rounded-lg overflow-hidden border border-gray-200">
                                <table className="w-full text-xs">
                                  <tbody className="divide-y divide-gray-100">
                                    {cs.sample_requests.map((req, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-3 py-1.5 w-14">
                                          <span className="font-mono bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">{req.method}</span>
                                        </td>
                                        <td className="px-3 py-1.5 font-mono text-gray-600">{req.path}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* FP Evaluation */}
                        <div className="px-5 py-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">False Positive Evaluation</p>

                          {fp && (
                            <>
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold mb-4 ${VERDICT_COLORS[fp.verdict] || 'bg-gray-100 text-gray-700'}`}>
                                {fp.verdict === 'SAFE'
                                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                }
                                {fp.verdict}
                              </div>

                              <div className="space-y-2.5 mb-4">
                                {[
                                  ['False Positives', fp.false_positive_count],
                                  ['FP Rate', `${(fp.false_positive_rate * 100).toFixed(2)}%`],
                                  ['Sample Size', fp.sample_size?.toLocaleString()],
                                  ['Max Allowed Rate', `${(fp.max_acceptable_rate * 100).toFixed(1)}%`],
                                ].map(([label, value]) => (
                                  <div key={label} className="flex justify-between text-xs">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-semibold text-gray-800">{value}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mb-4">
                                <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      fp.false_positive_rate === 0 ? 'bg-green-500'
                                        : fp.false_positive_rate > fp.max_acceptable_rate ? 'bg-red-500'
                                        : 'bg-amber-400'
                                    }`}
                                    style={{ width: `${fp.false_positive_rate === 0 ? 2 : Math.min(100, (fp.false_positive_rate / fp.max_acceptable_rate) * 100)}%` }}
                                  />
                                </div>
                                {fp.false_positive_rate === 0 && (
                                  <p className="text-xs text-green-600 mt-1">No false positives in sample</p>
                                )}
                              </div>
                            </>
                          )}

                          {llm?.false_positive_reason && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1.5">FP Risk Rationale</p>
                              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                                {llm.false_positive_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Regex */}
                      <div className="px-5 py-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Regex Pattern</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(s.regex_pattern, `regex-${s._id}`); }}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                              copiedId === `regex-${s._id}` ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            {copiedId === `regex-${s._id}` ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <code className="block text-xs font-mono bg-gray-900 text-green-400 px-4 py-3 rounded-lg break-all leading-relaxed mb-2">
                          {s.regex_pattern}
                        </code>
                        {llm?.regex_explanation && (
                          <p className="text-xs text-gray-500 leading-relaxed mt-2">{llm.regex_explanation}</p>
                        )}
                      </div>

                      {/* Rule text */}
                      <div className="px-5 py-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ModSecurity Rule</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(s.rule_text, `rule-${s._id}`); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              copiedId === `rule-${s._id}` ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {copiedId === `rule-${s._id}` ? 'Copied!' : 'Copy Rule'}
                          </button>
                        </div>
                        <pre className="text-xs font-mono bg-gray-900 text-gray-200 px-4 py-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {s.rule_text}
                        </pre>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No rule suggestions yet</p>
              <p className="text-gray-400 text-xs mt-1">Suggestions appear once the ML pipeline has analysed your traffic</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}