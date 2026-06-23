import React, { useState, useEffect } from 'react';
import { FileText, Download, Plus, AlertCircle, RefreshCw, CalendarRange } from 'lucide-react';
import { apiClient } from '../api';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Default date inputs: 7 days ago to today
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 7);
  
  const [periodStart, setPeriodStart] = useState(defaultStart.toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports');
      if (res.data.success) {
        setReports(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load generated reports:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (generating) return;
    setGenerating(true);
    setError('');

    try {
      // Set hours to encompass full days
      const startDateTime = new Date(periodStart);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(periodEnd);
      endDateTime.setHours(23, 59, 59, 999);

      const res = await apiClient.post('/reports/generate', {
        periodStart: startDateTime.toISOString(),
        periodEnd: endDateTime.toISOString()
      });

      if (res.data.success) {
        // Refetch reports list
        fetchReports();
      }
    } catch (err) {
      console.error('Failed to compile report:', err);
      setError(err.response?.data?.error || 'Failed to compile report. Make sure you have metric logs in the selected date range.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadFile = (id) => {
    // Triggers direct download using absolute url helper
    const downloadUrl = `http://localhost:5000/api/reports/${id}/download`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="border-b border-dark-border pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-blue" />
          Network Performance Reports
        </h2>
        <p className="text-xs text-dark-muted mt-1 font-medium">
          Compile historical performance audits and download printable documents for network administrative review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Report Form */}
        <div className="lg:col-span-1 bg-dark-card border border-dark-border p-6 rounded-2xl h-fit">
          <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-blue" />
            Compile New Audit
          </h3>

          <form onSubmit={handleGenerateReport} className="space-y-4">
            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="text-[10px] text-dark-muted font-bold uppercase tracking-widest block mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-blue"
              />
            </div>

            {error && (
              <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-brand-red mt-0.5 shrink-0" />
                <span className="text-[11px] text-brand-red font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
                generating
                  ? 'bg-dark-border text-dark-muted cursor-not-allowed'
                  : 'bg-brand-blue hover:bg-blue-600 text-white shadow-md shadow-blue-500/10'
              }`}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate Document
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Reports List */}
        <div className="lg:col-span-2 bg-dark-card border border-dark-border p-6 rounded-2xl">
          <h3 className="text-sm text-dark-text font-bold uppercase tracking-wider mb-4 border-b border-dark-border pb-3 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-brand-blue" />
            Generated Reports Archive
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-brand-blue animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-dark-muted text-xs border border-dashed border-dark-border rounded-xl">
              No reports compiled yet. Fill out the date range form to generate a report.
            </div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {reports.map((report) => (
                <div
                  key={report._id}
                  className="p-4 bg-dark-bg border border-dark-border rounded-xl flex items-center justify-between gap-4 hover:border-dark-border/80 transition-colors"
                >
                  <div className="space-y-1.5 max-w-[70%]">
                    <span className="text-[10px] text-dark-muted font-bold font-mono block">
                      Generated: {new Date(report.generatedAt).toLocaleString()}
                    </span>
                    <h4 className="font-bold text-xs text-dark-text">
                      Audit: {new Date(report.periodStart).toLocaleDateString()} to {new Date(report.periodEnd).toLocaleDateString()}
                    </h4>
                    <p className="text-[11px] text-dark-muted line-clamp-2 leading-relaxed">
                      {report.summary}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2.5">
                    <span className="text-sm font-bold text-brand-green font-mono">
                      {report.avgHealthScore}% Health
                    </span>
                    <button
                      onClick={() => downloadFile(report._id)}
                      className="p-2 rounded-lg bg-dark-card border border-dark-border text-brand-blue hover:text-white hover:bg-brand-blue hover:border-brand-blue transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
