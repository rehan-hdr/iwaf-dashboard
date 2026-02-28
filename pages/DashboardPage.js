'use client';

import { useState, useEffect } from 'react';

const DashboardPage = () => {
  const [requestsData, setRequestsData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [originsData, setOriginsData] = useState(null);
  const [classificationsData, setClassificationsData] = useState(null);
  const [additionalStats, setAdditionalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weekFilter, setWeekFilter] = useState('current'); // 'current' or 'previous'

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (week = 'current') => {
    setLoading(true);
    setError(null);
    try {
      const [requestsRes, usersRes, originsRes, classificationsRes, additionalRes] = await Promise.all([
        fetch(`/api/stats/requests?week=${week}`),
        fetch(`/api/stats/users?week=${week}`),
        fetch(`/api/stats/origins?week=${week}`),
        fetch(`/api/stats/classifications?week=${week}`),
        fetch('/api/stats/additional')
      ]);

      if (!requestsRes.ok || !usersRes.ok || !originsRes.ok || !classificationsRes.ok || !additionalRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [requests, users, origins, classifications, additional] = await Promise.all([
        requestsRes.json(),
        usersRes.json(),
        originsRes.json(),
        classificationsRes.json(),
        additionalRes.json()
      ]);

      setRequestsData(requests.data);
      setUsersData(users.data);
      setOriginsData(origins.data);
      setClassificationsData(classifications.data);
      setAdditionalStats(additional.data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A50] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, Ali</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Total Request Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Total Requests</h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {requestsData?.totalRequests?.toLocaleString() || '0'} total requests | Last 7 Days: {requestsData?.recentRequests || '0'}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <button 
                onClick={() => { setWeekFilter('current'); fetchAllData('current'); }}
                className={`whitespace-nowrap pb-1 transition-colors ${
                  weekFilter === 'current' 
                    ? 'text-[#FF7A50] font-medium border-b-2 border-[#FF7A50]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Current Week
              </button>
              <button 
                onClick={() => { setWeekFilter('previous'); fetchAllData('previous'); }}
                className={`whitespace-nowrap pb-1 transition-colors ${
                  weekFilter === 'previous' 
                    ? 'text-[#FF7A50] font-medium border-b-2 border-[#FF7A50]' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Previous Week
              </button>
            </div>
          </div>
          
          {/* Chart */}
          <div className="relative" style={{ height: '280px' }}>
            {requestsData?.chartData && requestsData.chartData.length > 0 && (
              <div className="h-full flex gap-3 p-4">
                {/* Y-axis */}
                <div className="flex flex-col justify-between text-xs text-gray-400 pt-2 pb-8">
                  {(() => {
                    const maxCount = Math.max(...requestsData.chartData.map(d => d.count), 1);
                    const yMax = Math.ceil(maxCount / 5) * 5; // Round up to nearest 5
                    return [...Array(6)].map((_, i) => {
                      const value = Math.round((yMax * (5 - i)) / 5);
                      return <div key={i}>{value}</div>;
                    });
                  })()}
                </div>
                
                {/* Chart area */}
                <div className="flex-1 flex flex-col">
                  {/* Grid and bars container */}
                  <div className="flex-1 relative pt-2 pb-2">
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-full border-t border-gray-200"></div>
                      ))}
                    </div>
                    
                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end justify-around px-2">
                      {requestsData.chartData.map((dayData, index) => {
                        const maxCount = Math.max(...requestsData.chartData.map(d => d.count), 1);
                        const yMax = Math.ceil(maxCount / 5) * 5;
                        const heightPercent = (dayData.count / yMax) * 100;
                        
                        return (
                          <div key={index} className="flex-1 flex justify-center items-end h-full group relative px-1">
                            <div 
                              className="w-full max-w-[50px] bg-gradient-to-t from-[#FF7A50] to-[#FF9068] rounded-t hover:opacity-80 transition-all cursor-pointer relative"
                              style={{ 
                                height: `${heightPercent}%`,
                                minHeight: dayData.count > 0 ? '3px' : '0'
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                {dayData.count} requests
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* X-axis labels */}
                  <div className="flex justify-around pt-2 pb-2">
                    {requestsData.chartData.map((dayData, index) => (
                      <div key={index} className="flex-1 text-center text-xs text-gray-400">
                        {dayData.day}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total User Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Total User</h2>
            <select className="text-sm text-gray-600 border-none focus:outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>
          
          {/* Circular Progress */}
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                <circle
                  cx="96"
                  cy="96"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="70"
                  stroke="#4ADE80"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (440 * (usersData?.normalPercentage || 0) / 100)}
                  strokeLinecap="round"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="70"
                  stroke="#FF7A50"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (440 * (usersData?.maliciousPercentage || 0) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500">User</span>
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {usersData?.totalUsers?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Normal ({usersData?.normalUsers || 0})</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#FF7A50] rounded-full"></div>
                <span className="text-sm text-gray-600">Malicious ({usersData?.maliciousUsers || 0})</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Origins Section */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Origins</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {originsData?.topOrigins?.map((origin, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FF7A50] to-[#FF9068] rounded-full flex items-center justify-center text-2xl">
                    {origin.flag}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{origin.country}</p>
                    <p className="text-2xl font-bold text-gray-900">{origin.totalRequests.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Total Requests</p>
                  </div>
                </div>
                <div className={`${origin.trendUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} text-xs font-semibold px-3 py-1 rounded-full`}>
                  {origin.trendUp ? '↗' : '↘'} {origin.trend}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attack Classification Section */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Attack Classification</h2>
        <p className="text-sm text-gray-500 mb-4">Note: Each request can trigger multiple attack detections. Total attacks may exceed total requests.</p>
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          {classificationsData?.classifications && classificationsData.classifications.length > 0 ? (
            <>
              {/* Bar Chart */}
              <div className="space-y-4 mb-6">
                {classificationsData.classifications.map((classification, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: classification.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">{classification.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{classification.count} attacks</span>
                        <span className="text-sm font-semibold text-gray-900">{classification.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${classification.percentage}%`,
                          backgroundColor: classification.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{classificationsData.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Attacks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{classificationsData.classifications.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Attack Types</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#FF7A50]">
                    {classificationsData.classifications[0]?.percentage || 0}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Most Common</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">100%</p>
                  <p className="text-xs text-gray-500 mt-1">Blocked</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No attack classification data available
            </div>
          )}
        </div>
      </div>

      {/* Additional Statistics Grid */}
      {additionalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          

          {/* HTTP Methods */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
              HTTP Methods Used
            </h3>
            <div className="space-y-3">
              {additionalStats.methods.map((item) => {
                const methodColors = {
                  GET: 'bg-blue-500',
                  POST: 'bg-green-500',
                  PUT: 'bg-yellow-500',
                  DELETE: 'bg-red-500',
                  PATCH: 'bg-purple-500',
                  HEAD: 'bg-gray-500',
                  OPTIONS: 'bg-indigo-500'
                };
                const maxCount = Math.max(...additionalStats.methods.map(m => m.count));
                const widthPercent = (item.count / maxCount) * 100;

                return (
                  <div key={item._id} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                      {item._id}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-full ${methodColors[item._id] || 'bg-gray-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="w-12 text-sm font-medium text-gray-800 text-right">
                      {item.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Block Rate & Response Codes */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
              Block Rate & Response Codes
            </h3>
            <p className="text-xs text-gray-500 mb-4">HTTP 403 = Blocked by WAF</p>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#FF7A50"
                    strokeWidth="12"
                    strokeDasharray={`${(additionalStats.blockRate / 100) * 351.86} 351.86`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {additionalStats.blockRate.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">Blocked</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Attacks:</span>
                <span className="font-medium text-gray-800">{additionalStats.totalAttacks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blocked:</span>
                <span className="font-medium text-green-600">{additionalStats.blockedAttacks}</span>
              </div>
              <div className="border-t pt-2 mt-3">
                <div className="text-xs text-gray-500 mb-2">Response Codes:</div>
                {additionalStats.responseCodes.map((item) => (
                  <div key={item._id} className="flex justify-between py-1">
                    <span className="text-gray-600">HTTP {item._id}:</span>
                    <span className="font-medium text-gray-800">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Attacked URIs */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
              Top Attacked URIs
            </h3>
            <div className="space-y-3">
              {additionalStats.topURIs.length > 0 ? (
                additionalStats.topURIs.map((item, index) => (
                  <div
                    key={item._id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-gray-800 break-all">
                        {item._id || '/'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.count} attack{item.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No URI data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
