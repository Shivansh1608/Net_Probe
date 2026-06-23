import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '../api';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Local state mirroring settings model structure
  const [scanInterval, setScanInterval] = useState(5);
  const [targetHosts, setTargetHosts] = useState('');
  const [packetLossLimit, setPacketLossLimit] = useState(5);
  const [packetLossCritical, setPacketLossCritical] = useState(15);
  const [dnsTimeLimit, setDnsTimeLimit] = useState(100);
  const [wifiSignalLimit, setWifiSignalLimit] = useState(40);
  const [routingLatencyLimit, setRoutingLatencyLimit] = useState(150);
  const [routingSpeedLimit, setRoutingSpeedLimit] = useState(20);
  const [bandwidthDropThreshold, setBandwidthDropThreshold] = useState(40);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await apiClient.get('/settings');
        if (res.data.success && res.data.data) {
          const s = res.data.data;
          setSettings(s);
          setScanInterval(s.scanInterval);
          setTargetHosts(s.targetHosts.join(', '));
          
          const th = s.thresholds;
          setPacketLossLimit(th.packetLossLimit);
          setPacketLossCritical(th.packetLossCritical);
          setDnsTimeLimit(th.dnsTimeLimit);
          setWifiSignalLimit(th.wifiSignalLimit);
          setRoutingLatencyLimit(th.routingLatencyLimit);
          setRoutingSpeedLimit(th.routingSpeedLimit);
          setBandwidthDropThreshold(Math.round(th.bandwidthDropThreshold * 100)); // convert decimal e.g. 0.4 -> 40
        }
      } catch (err) {
        console.error('Failed to load application settings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    // Parse host inputs
    const parsedHosts = targetHosts
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    if (parsedHosts.length === 0) {
      setErrorMsg('You must configure at least one scanning target host.');
      setSaving(false);
      return;
    }

    const payload = {
      scanInterval: parseInt(scanInterval, 10),
      targetHosts: parsedHosts,
      thresholds: {
        packetLossLimit: parseFloat(packetLossLimit),
        packetLossCritical: parseFloat(packetLossCritical),
        dnsTimeLimit: parseInt(dnsTimeLimit, 10),
        wifiSignalLimit: parseInt(wifiSignalLimit, 10),
        routingLatencyLimit: parseInt(routingLatencyLimit, 10),
        routingSpeedLimit: parseFloat(routingSpeedLimit),
        bandwidthDropThreshold: parseFloat(bandwidthDropThreshold) / 100 // convert 40 -> 0.4
      }
    };

    try {
      const res = await apiClient.put('/settings', payload);
      if (res.data.success) {
        setSuccessMsg('Application settings successfully updated and background jobs rescheduled.');
        // Clear success message after 4s
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMsg('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[75vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-blue animate-spin" />
          <p className="text-sm font-semibold text-dark-muted">Loading settings panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Title */}
      <div className="border-b border-dark-border pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-blue" />
          System Settings
        </h2>
        <p className="text-xs text-dark-muted mt-1 font-medium">
          Modify active scanning polling intervals and customize the threshold bounds for the diagnostic engine rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Connection Polling Setup */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
          <h3 className="text-xs text-brand-blue font-bold uppercase tracking-wider">Background Scanner Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                Scan Interval (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={scanInterval}
                onChange={(e) => setScanInterval(e.target.value)}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
              />
              <span className="text-[10px] text-dark-muted mt-1 block">
                How often the analyzer runs in the background. Changing this reschedules node-cron.
              </span>
            </div>

            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                Target Ping Server Hosts
              </label>
              <input
                type="text"
                value={targetHosts}
                onChange={(e) => setTargetHosts(e.target.value)}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
              />
              <span className="text-[10px] text-dark-muted mt-1 block">
                Comma-separated hostnames or IP addresses (e.g. 8.8.8.8, 1.1.1.1, google.com). First host serves as primary.
              </span>
            </div>
          </div>
        </div>

        {/* Rule Heuristic Thresholds */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
          <h3 className="text-xs text-brand-blue font-bold uppercase tracking-wider">Diagnostic Engine Rule Thresholds</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Packet Loss */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  Packet Loss Limit (%) - Warning Trigger
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={packetLossLimit}
                  onChange={(e) => setPacketLossLimit(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  Critical Packet Loss Limit (%) - High Severity
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={packetLossCritical}
                  onChange={(e) => setPacketLossCritical(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  DNS Response Limit (ms)
                </label>
                <input
                  type="number"
                  min="1"
                  value={dnsTimeLimit}
                  onChange={(e) => setDnsTimeLimit(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  Weak Wi-Fi Signal Trigger (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={wifiSignalLimit}
                  onChange={(e) => setWifiSignalLimit(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            {/* Speeds & Routing */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  Routing High Latency Limit (ms)
                </label>
                <input
                  type="number"
                  min="1"
                  value={routingLatencyLimit}
                  onChange={(e) => setRoutingLatencyLimit(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  Routing Speed Limit (Mbps)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={routingSpeedLimit}
                  onChange={(e) => setRoutingSpeedLimit(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                  Bandwidth Bottleneck Drop Limit (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={bandwidthDropThreshold}
                  onChange={(e) => setBandwidthDropThreshold(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Indicators */}
        {successMsg && (
          <div className="p-4 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex items-start gap-2">
            <span className="text-xs text-brand-green font-bold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-brand-red/10 border border-brand-red/20 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-brand-red mt-0.5 shrink-0" />
            <span className="text-xs text-brand-red font-bold">{errorMsg}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all shadow-md ${
            saving
              ? 'bg-dark-border text-dark-muted cursor-not-allowed'
              : 'bg-brand-blue hover:bg-blue-600 text-white shadow-blue-500/10'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Panel...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
