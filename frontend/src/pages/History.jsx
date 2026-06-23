import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { History as HistoryIcon, ShieldAlert, Calendar, RefreshCw } from 'lucide-react';
import { apiClient } from '../api';

export default function History() {
  const [range, setRange] = useState('24h');
  const [metrics, setMetrics] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/metrics/history?range=${range}`);
        if (res.data.success && res.data.data) {
          setMetrics(res.data.data.metrics);
          setDiagnoses(res.data.data.diagnoses);
        }
      } catch (err) {
        console.error('Failed to load historical scan logs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [range]);

  const formatXAxis = (tick) => {
    try {
      const date = new Date(tick);
      if (range === '1h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (range === '24h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return tick;
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-card border border-dark-border p-3.5 rounded-xl shadow-xl">
          <p className="text-xs text-dark-muted font-bold mb-1.5">{new Date(label).toLocaleString()}</p>
          {payload.map((p, idx) => (
            <p key={idx} className="text-xs font-semibold" style={{ color: p.color }}>
              {p.name}: {p.value.toFixed(1)} {p.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-brand-blue" />
            Performance History
          </h2>
          <p className="text-xs text-dark-muted mt-1 font-medium">
            Analyze network latency, packet loss, bandwidth speeds, and signal trends over time.
          </p>
        </div>

        {/* Time Selector */}
        <div className="flex bg-dark-card border border-dark-border p-1 rounded-xl">
          {['1h', '24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                range === r
                  ? 'bg-brand-blue text-white shadow'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
            <p className="text-sm font-semibold text-dark-muted">Compiling historical charts...</p>
          </div>
        </div>
      ) : metrics.length === 0 ? (
        <div className="py-20 text-center bg-dark-card border border-dark-border rounded-2xl flex flex-col items-center justify-center p-8">
          <Calendar className="w-12 h-12 text-dark-muted mb-4 animate-pulse" />
          <h3 className="font-bold text-lg text-dark-text">No data for this interval</h3>
          <p className="text-sm text-dark-muted max-w-sm mt-2">
            Try checking a larger range or click 'Scan Now' on the dashboard to log new performance metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Recharts Diagrams */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Health Score & Latency */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4">
                Connection Health & Latency
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatXAxis} stroke="#64748B" style={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#10B981" style={{ fontSize: 10 }} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#3B82F6" style={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" style={{ fontSize: 11 }} />
                    <Area yAxisId="left" type="monotone" dataKey="healthScore" name="Health Score" unit="%" stroke="#10B981" fillOpacity={1} fill="url(#colorHealth)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="latency" name="Latency" unit=" ms" stroke="#3B82F6" dot={false} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bandwidth (Download vs Upload) */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4">
                Bandwidth throughput (Mbps)
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatXAxis} stroke="#64748B" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748B" style={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" style={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="downloadSpeed" name="Download" unit=" Mbps" stroke="#10B981" dot={false} strokeWidth={2.5} />
                    <Line type="monotone" dataKey="uploadSpeed" name="Upload" unit=" Mbps" stroke="#8B5CF6" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Packet Loss & DNS Timing */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4">
                Packet Loss & DNS timing
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatXAxis} stroke="#64748B" style={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#EF4444" style={{ fontSize: 10 }} label={{ value: 'Loss %', angle: -90, position: 'insideLeft', style: { fill: '#EF4444', fontSize: 10 } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" style={{ fontSize: 10 }} label={{ value: 'DNS ms', angle: 90, position: 'insideRight', style: { fill: '#F59E0B', fontSize: 10 } }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" style={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="packetLoss" name="Packet Loss" unit="%" stroke="#EF4444" dot={false} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="dnsTime" name="DNS Resolving" unit=" ms" stroke="#F59E0B" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Wi-Fi Signal Strength */}
            <div className="bg-dark-card border border-dark-border p-6 rounded-2xl">
              <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4">
                Wi-Fi Link Signal Strength
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWifi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatXAxis} stroke="#64748B" style={{ fontSize: 10 }} />
                    <YAxis stroke="#64748B" style={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="wifiSignal" name="Signal strength" unit="%" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorWifi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Historical Diagnostics list */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4 border-b border-dark-border pb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-blue" />
              Historical Diagnostics Log ({diagnoses.length} Events)
            </h3>

            {diagnoses.length === 0 ? (
              <div className="py-8 text-center text-dark-muted text-xs">
                No incidents or warning flags registered during this historical window.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-dark-border text-dark-muted uppercase font-bold text-[10px] tracking-wider">
                      <th className="pb-3 pr-4">Timestamp</th>
                      <th className="pb-3 px-4">Severity</th>
                      <th className="pb-3 px-4 font-mono">Issue Code</th>
                      <th className="pb-3 pl-4">Diagnostic Details / Suggested Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {diagnoses.map((d) => {
                      let badge = 'text-brand-blue bg-brand-blue/10';
                      if (d.severity === 'high') badge = 'text-brand-red bg-brand-red/10';
                      if (d.severity === 'medium') badge = 'text-brand-amber bg-brand-amber/10';

                      return (
                        <tr key={d._id} className="hover:bg-dark-bg/25">
                          <td className="py-3.5 pr-4 whitespace-nowrap text-dark-muted font-semibold">
                            {new Date(d.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded font-extrabold uppercase text-[9px] ${badge}`}>
                              {d.severity}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-dark-muted whitespace-nowrap">
                            {d.issueType}
                          </td>
                          <td className="py-3.5 pl-4 leading-relaxed">
                            <p className="font-bold text-dark-text">{d.explanation}</p>
                            <p className="text-dark-muted mt-0.5">
                              <span className="text-dark-text font-semibold">Action:</span> {d.suggestion}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
