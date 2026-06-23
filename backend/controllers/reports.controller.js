const Metric = require('../models/Metric');
const Diagnosis = require('../models/Diagnosis');
const Report = require('../models/Report');
const { generatePDFReport } = require('../utils/pdfGenerator');
const { generateAISummary } = require('../services/aiSummaryService');
const path = require('path');
const fs = require('fs');

/**
 * List all generated reports
 */
exports.listReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ generatedAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Generates an audit report for a custom date range
 */
exports.generateReport = async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, error: 'Both periodStart and periodEnd parameters are required.' });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Fetch metric records in the requested timeframe
    const metrics = await Metric.find({
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 });

    if (metrics.length === 0) {
      return res.status(400).json({ success: false, error: 'No metrics data found for the selected date range.' });
    }

    // Fetch corresponding diagnoses in the timeframe
    const diagnoses = await Diagnosis.find({
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 });

    // Mathematical aggregator for min/max/avg
    const calculateStats = (field) => {
      const values = metrics.map(m => m[field]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((s, v) => s + v, 0);
      const avg = sum / values.length;
      return { min, max, avg };
    };

    const stats = {
      latency: calculateStats('latency'),
      packetLoss: calculateStats('packetLoss'),
      dnsTime: calculateStats('dnsTime'),
      downloadSpeed: calculateStats('downloadSpeed'),
      uploadSpeed: calculateStats('uploadSpeed'),
      wifiSignal: calculateStats('wifiSignal')
    };

    // Calculate Average Health Score over the period
    let totalHealthScore = 0;
    metrics.forEach(m => {
      let score = 100;
      score -= m.packetLoss * 2;
      if (m.latency > 100) score -= (m.latency - 100) * 0.2;
      if (m.dnsTime > 50) score -= (m.dnsTime - 50) * 0.1;
      if (m.wifiSignal < 50) score -= (50 - m.wifiSignal) * 0.3;
      totalHealthScore += Math.max(0, Math.min(100, score));
    });
    const avgHealthScore = totalHealthScore / metrics.length;

    // AI or Static summary text compilation
    let summaryText = '';
    if (process.env.ENABLE_AI_SUMMARY === 'true') {
      const representativeMetric = metrics[metrics.length - 1]; // Use latest sample in range
      summaryText = await generateAISummary(representativeMetric, diagnoses);
    } else {
      // Standard static rule fallback
      const uniqueIssues = [...new Set(diagnoses.map(d => d.issueType))];
      summaryText = `During this audit period (${start.toLocaleDateString()} to ${end.toLocaleDateString()}), the analyzer parsed ${metrics.length} data points. The average connection health score calculated is ${Math.round(avgHealthScore)}%.`;
      if (uniqueIssues.length > 0) {
        summaryText += ` The network recorded issues relating to: ${uniqueIssues.join(', ')}. Examine the detailed diagnosis timeline to see specific troubleshooting paths.`;
      } else {
        summaryText += ' Connection performance remained within normal parameters with zero recorded anomalies.';
      }
    }

    // Establish storage output paths
    const filename = `report_${Date.now()}.pdf`;
    const storageDir = path.join(__dirname, '..', 'storage', 'reports');
    const outputPath = path.join(storageDir, filename);

    const reportData = {
      periodStart: start,
      periodEnd: end,
      avgHealthScore,
      metricsCount: metrics.length,
      stats,
      diagnoses,
      aiSummary: summaryText
    };

    // Generate physical document (PDF or fallback HTML)
    const finalFilePath = await generatePDFReport(reportData, outputPath);
    
    // Store relative path in Mongoose model (so we can run in multi-environment settings)
    const relativePath = path.relative(path.join(__dirname, '..'), finalFilePath).replace(/\\/g, '/');

    const newReport = new Report({
      periodStart: start,
      periodEnd: end,
      summary: summaryText,
      avgHealthScore: Math.round(avgHealthScore),
      filePath: relativePath
    });

    await newReport.save();

    res.status(201).json({ success: true, data: newReport });
  } catch (err) {
    console.error('Report compilation failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Downloads a generated PDF/HTML file
 */
exports.downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found in database.' });
    }

    const absolutePath = path.join(__dirname, '..', report.filePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Physical report file not found on disk.' });
    }

    const fileExt = path.extname(absolutePath).toLowerCase();
    if (fileExt === '.html') {
      res.setHeader('Content-Type', 'text/html');
    } else {
      res.setHeader('Content-Type', 'application/pdf');
    }

    res.download(absolutePath);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
