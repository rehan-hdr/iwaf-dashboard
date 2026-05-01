'use client';

import { useEffect, useState } from 'react';

const STATUS_CONFIG = {
  operational: {
    label: 'Operational',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
  },
  idle: {
    label: 'Idle',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
  },
  inactive: {
    label: 'Inactive',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-600',
  },
  connected: {
    label: 'Connected',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700',
  },
  unknown: {
    label: 'No data',
    dotClass: 'bg-slate-300',
    textClass: 'text-slate-500',
  },
};

const FRESH_THRESHOLD_MIN = 5;
const STALE_THRESHOLD_MIN = 30;

function deriveStatus(subsystem) {
  if (subsystem.id === 'mongodb') {
    return subsystem.last_activity === 'connected' ? 'connected' : 'error';
  }
  if (!subsystem.last_activity) return 'unknown';
  const ageMs = Date.now() - new Date(subsystem.last_activity).getTime();
  const ageMin = ageMs / 60000;
  if (ageMin < FRESH_THRESHOLD_MIN) return 'operational';
  if (ageMin < STALE_THRESHOLD_MIN) return 'idle';
  return 'inactive';
}

function formatRelative(timestamp) {
  if (!timestamp || timestamp === 'connected') return null;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageMin = Math.floor(ageMs / 60000);
  if (ageMin < 1) return 'less than a minute ago';
  if (ageMin < 60) return `${ageMin} minute${ageMin === 1 ? '' : 's'} ago`;
  const ageHr = Math.floor(ageMin / 60);
  if (ageHr < 24) return `${ageHr} hour${ageHr === 1 ? '' : 's'} ago`;
  const ageDay = Math.floor(ageHr / 24);
  return `${ageDay} day${ageDay === 1 ? '' : 's'} ago`;
}

export default function SystemHealthPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/system-health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        if (!body.success) throw new Error('API returned success=false');
        setData(body.data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load system health');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">System Health</h1>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Data
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        Subsystem status derived from the most recent activity recorded in the database.
        Refresh the page to update.
      </p>

      {loading && (
        <div className="text-sm text-slate-500">Loading status...</div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to fetch system health: {error}
        </div>
      )}

      {data && (
        <>
          <div className="text-xs text-slate-500 mb-3">
            Checked at {new Date(data.checked_at).toLocaleString()}
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {data.subsystems.map((sub, idx) => {
              const status = deriveStatus(sub);
              const cfg = STATUS_CONFIG[status];
              const relative = formatRelative(sub.last_activity);
              return (
                <div
                  key={sub.id}
                  className={`flex items-start gap-4 px-5 py-4 ${
                    idx > 0 ? 'border-t border-slate-200' : ''
                  } bg-white`}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full ${cfg.dotClass} flex-shrink-0`}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="font-medium text-slate-900">{sub.name}</div>
                      <div className={`text-sm font-medium ${cfg.textClass}`}>
                        {cfg.label}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{sub.description}</div>
                    {relative && (
                      <div className="text-xs text-slate-500 mt-1">
                        Last activity: {relative}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
