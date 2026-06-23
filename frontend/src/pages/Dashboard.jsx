import React, { useState, useEffect } from 'react';
import { Activity, ArrowDown, ArrowUp, Wifi, ShieldAlert, Cpu, RefreshCw, Layers } from 'lucide-react';
import { apiClient, socket } from '../api';

/**
 * Custom SVG Radial Gauge for the Network Health Score
 */
function HealthScoreGauge({ score }) {
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = 'text-brand-green';
  let ratingText = 'Excellent';
  let ratingColor = 'text-brand-green';

  if (score < 40) {
    colorClass = 'text-brand-red';
    ratingText = 'Critical';
    ratingColor = 'text-brand-red';
  } else if (score < 75) {
    colorClass = 'text-brand-amber';
    ratingText = 'Fair';
    ratingColor = 'text-brand-amber';
  }

  return (
    <div className="flex flex-col items-center justify-center bg-dark-card border border-dark-border p-6 rounded-2xl h-full">
      <h3 className="text-xs text-dark-muted font-bold uppercase tracking-wider mb-4">Connection Health Score</h3>
      <div className="relative flex items-center justify-center w-36 h-36">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="text-dark-border stroke-current"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="72"
            cy="72"
            r={radius}
            className={`${colorClass} stroke-current transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-4xl font-extrabold tracking-tight">{score}</span>
          <span className="text-dark-muted font-bold text-[10px] uppercase block tracking-widest mt-0.5">%</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-dark-muted">Status:</span>
        <span className={`text-xs font-bold ${ratingColor}`}>{ratingText}</span>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({ title, value, unit, icon: Icon, color, hoverBorder }) {
  return (
    <div className={`bg-dark-card border border-dark-border p-5 rounded-2xl transition-all duration-200 hover:border-${color} hover:shadow-lg hover:shadow-${color}/5 group`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs text-dark-muted font-bold uppercase tracking-wider block mb-1">{title}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold tracking-tight">{value}</span>
            <span className="text-xs text-dark-muted font-semibold">{unit}</span>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl bg-dark-bg border border-dark-border text-${color} transition-all duration-200 group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');

  useEffect(() => {
    // Fetch latest scan data
    async function fetchLatest() {
      try {
        const res = await apiClient.get('/metrics/latest');
        if (res.data.success && res.data.data) {
          setLatestData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to retrieve latest metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatest();

    // Attach websocket listener
    socket.on('metric:new', (data) => {
      setLatestData(data);
    });

    return () => {
      socket.off('metric:new');
    };
  }, []);

  const triggerScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanStep('Pinging DNS and target hosts...');

    const stepTimers = [
      setTimeout(() => setScanStep('Measuring DNS query resolution times...'), 1200),
      setTimeout(() => setScanStep('Analyzing upload and download throughput...'), 2800),
      setTimeout(() => setScanStep('Checking local Wi-Fi interface signal strength...'), 4500),
      setTimeout(() => setScanStep('Executing correlation diagnostic heuristics...'), 6000)
    ];

    try {
      const res = await apiClient.post('/metrics/scan-now');
      if (res.data.success && res.data.data) {
        setLatestData(res.data.data);
      }
    } catch (err) {
      console.error('Manual network audit failed:', err);
    } finally {
      stepTimers.forEach(clearTimeout);
      setScanning(false);
      setScanStep('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[75vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
          <p className="text-sm font-semibold text-dark-muted">Loading network analytics...</p>
        </div>
      </div>
    );
  }

  const hasData = latestData && latestData.metric;
  const metric = hasData ? latestData.metric : null;
  const healthScore = hasData ? latestData.healthScore : 100;
  const diagnoses = hasData ? latestData.diagnoses : [];

  return (
    <div className="space-y-8">
      {/* Top Title Section */}
      <div className="flex justify-between items-center border-b border-dark-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text">Live Network performance</h2>
          <p className="text-xs text-dark-muted mt-1 font-medium">
            {hasData 
              ? `Last Scanned Host: ${metric.targetHost} | Timestamp: ${new Date(metric.timestamp).toLocaleString()}`
              : 'No network scans logged. Start by initiating a scan below.'
            }
          </p>
        </div>

        <button
          onClick={triggerScan}
          disabled={scanning}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-md ${
            scanning
              ? 'bg-dark-border text-dark-muted cursor-not-allowed'
              : 'bg-brand-blue hover:bg-blue-600 text-white shadow-blue-500/10'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Auditing Network...' : 'Scan Now'}
        </button>
      </div>

      {/* Audit scanning overlay */}
      {scanning && (
        <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-6 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <Cpu className="w-8 h-8 text-brand-blue animate-spin" />
            <div>
              <h4 className="font-bold text-sm text-dark-text">Continuous Diagnostics Active</h4>
              <p className="text-xs text-brand-blue font-semibold mt-0.5">{scanStep}</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-blue bg-brand-blue/10 px-3 py-1 rounded-full">
            SCANNING
          </span>
        </div>
      )}

      {/* Main Stats Display */}
      {hasData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gauge */}
            <div className="lg:col-span-1">
              <HealthScoreGauge score={healthScore} />
            </div>

            {/* Metrics cards grid */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricCard
                title="Latency (Ping)"
                value={metric.latency}
                unit="ms"
                icon={Activity}
                color="brand-blue"
              />
              <MetricCard
                title="Packet Loss"
                value={metric.packetLoss}
                unit="%"
                icon={ShieldAlert}
                color="brand-red"
              />
              <MetricCard
                title="DNS Lookup"
                value={metric.dnsTime}
                unit="ms"
                icon={Layers}
                color="brand-amber"
              />
              <MetricCard
                title="Wi-Fi Signal"
                value={metric.wifiSignal}
                unit="%"
                icon={Wifi}
                color="brand-green"
              />
              <MetricCard
                title="Download Speed"
                value={metric.downloadSpeed}
                unit="Mbps"
                icon={ArrowDown}
                color="brand-green"
              />
              <MetricCard
                title="Upload Speed"
                value={metric.uploadSpeed}
                unit="Mbps"
                icon={ArrowUp}
                color="brand-purple"
              />
            </div>
          </div>

          {/* Diagnostic Feed */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4 border-b border-dark-border pb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-blue" />
              Active Diagnostics Feed
            </h3>

            {diagnoses.length === 0 ? (
              <div className="py-8 text-center bg-dark-bg/30 border border-dashed border-dark-border rounded-xl">
                <span className="text-xs text-brand-green font-bold uppercase tracking-wider block mb-1">
                  Network Healthy
                </span>
                <p className="text-xs text-dark-muted">No diagnostic anomalies were triggered during this scan cycle.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {diagnoses.map((issue) => {
                  let badgeColor = 'bg-brand-blue/10 text-brand-blue';
                  if (issue.severity === 'high') badgeColor = 'bg-brand-red/10 text-brand-red';
                  if (issue.severity === 'medium') badgeColor = 'bg-brand-amber/10 text-brand-amber';

                  return (
                    <div
                      key={issue._id}
                      className="p-5 bg-dark-bg border border-dark-border rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded ${badgeColor}`}>
                            {issue.severity} Severity
                          </span>
                          <span className="text-xs font-mono font-bold text-dark-muted">
                            [{issue.issueType}]
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-dark-text">{issue.explanation}</h4>
                        <p className="text-xs text-dark-muted leading-relaxed">
                          <strong className="text-dark-text font-semibold">Recommended Fix: </strong>
                          {issue.suggestion}
                        </p>
                      </div>
                      <div className="text-right flex md:flex-col items-center md:items-end justify-between md:justify-start gap-1">
                        <span className="text-[10px] text-dark-muted font-mono block">
                          -{issue.healthScoreImpact} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-16 text-center bg-dark-card border border-dark-border rounded-2xl flex flex-col items-center justify-center p-8">
          <Activity className="w-12 h-12 text-dark-muted mb-4 animate-pulse" />
          <h3 className="font-bold text-lg text-dark-text">No scans logged</h3>
          <p className="text-sm text-dark-muted max-w-sm mt-2 mb-6">
            The database does not contain any performance metrics. Click the button below to initiate your first audit.
          </p>
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-blue hover:bg-blue-600 text-white transition-all shadow-md shadow-blue-500/10"
          >
            <RefreshCw className="w-4 h-4" />
            Run Initial Diagnostics Scan
          </button>
        </div>
      )}
    </div>
  );
}
