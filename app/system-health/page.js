'use client';

import { SYSTEM_HEALTH } from '@/lib/mockData';

function Gauge({ value, label, color = '#FF7A50', size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-gray-800">{value}%</span>
      </div>
      <span className="text-sm text-gray-500 mt-2">{label}</span>
    </div>
  );
}

function Sparkline({ data, color = '#FF7A50', height = 40, width = 200 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default function SystemHealthPage() {
  const { server, cpu, memory, requests, database, wafLayers } = SYSTEM_HEALTH;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2"><span className="text-amber-500">(HARDCODED)</span> System Health</h1>
      <p className="text-gray-500 text-sm mb-4 sm:mb-6">Monitor WAF performance, resources, and layer status</p>

      {/* Server Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <div>
            <div className="text-base sm:text-lg font-semibold text-gray-800">{server.status}</div>
            <div className="text-sm text-gray-500">Uptime: {server.uptime}</div>
          </div>
        </div>
        <div className="text-sm text-gray-500">{server.version}</div>
        <div className="text-sm text-gray-500">
          Last restart: {new Date(server.lastRestart).toLocaleDateString()}
        </div>
      </div>

      {/* Gauges Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col items-center relative">
          <Gauge value={cpu.usage} label={`CPU (${cpu.cores} cores)`} color="#FF7A50" />
          <div className="mt-4 w-full overflow-hidden">
            <Sparkline data={cpu.history} color="#FF7A50" width={240} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col items-center relative">
          <Gauge value={memory.usage} label="Memory" color="#3B82F6" />
          <div className="mt-2 text-sm text-gray-500 text-center">
            {memory.used} / {memory.total}
          </div>
          <div className="mt-2 w-full overflow-hidden">
            <Sparkline data={memory.history} color="#3B82F6" width={240} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col items-center sm:col-span-2 lg:col-span-1">
          <div className="text-2xl sm:text-3xl font-bold text-gray-800">{requests.perSecond}</div>
          <div className="text-sm text-gray-500">Requests/sec</div>
          <div className="text-sm text-gray-500 mt-1">Avg response: {requests.avgResponseTime}</div>
          <div className="mt-4 w-full overflow-hidden">
            <Sparkline data={requests.history} color="#10B981" width={240} />
          </div>
        </div>
      </div>

      {/* Database + WAF Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Database */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Database</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {database.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Collections</span>
              <span className="text-sm font-medium text-gray-800">{database.collections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Documents</span>
              <span className="text-sm font-medium text-gray-800">{database.totalDocs.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Avg Query Time</span>
              <span className="text-sm font-medium text-gray-800">{database.avgQueryTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Database Size</span>
              <span className="text-sm font-medium text-gray-800">{database.size}</span>
            </div>
          </div>
        </div>

        {/* WAF Layers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">WAF Layers</h2>
          <div className="space-y-3">
            {wafLayers.map((layer) => {
              const blockRate = ((layer.blocked / layer.processed) * 100).toFixed(1);
              return (
                <div key={layer.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-800">{layer.name}</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm ml-5 sm:ml-0">
                    <span className="text-gray-500">{layer.processed.toLocaleString()} proc</span>
                    <span className="text-red-600 font-medium">{layer.blocked.toLocaleString()} blocked</span>
                    <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                      {blockRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
