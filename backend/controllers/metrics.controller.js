const Metric = require('../models/Metric');
const Diagnosis = require('../models/Diagnosis');
const Settings = require('../models/Settings');
const { diagnoseNetwork } = require('../services/diagnosticEngine');
const { performScan } = require('../jobs/scheduler');

/**
 * Fetch the latest metric and its associated diagnoses
 */
exports.getLatestMetric = async (req, res) => {
  try {
    const latest = await Metric.findOne().sort({ timestamp: -1 });
    if (!latest) {
      return res.status(200).json({ success: true, data: null });
    }

    const settings = await Settings.getSettings();
    const diagnoses = await Diagnosis.find({ metricId: latest._id });
    const { healthScore } = await diagnoseNetwork(latest, settings);

    res.status(200).json({
      success: true,
      data: {
        metric: latest,
        healthScore,
        diagnoses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Fetch historical metrics and diagnoses for graphs
 */
exports.getMetricsHistory = async (req, res) => {
  try {
    const { range } = req.query;
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case '1h':
        startDate.setHours(now.getHours() - 1);
        break;
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setHours(now.getHours() - 24); // default 24h
        break;
    }

    // Retrieve metrics and matching diagnoses
    const metrics = await Metric.find({ timestamp: { $gte: startDate } }).sort({ timestamp: 1 });
    const diagnoses = await Diagnosis.find({ timestamp: { $gte: startDate } }).sort({ timestamp: 1 });

    // Compute Health Scores for each point in history dynamically
    const formattedMetrics = metrics.map(m => {
      let healthScore = 100;
      healthScore -= m.packetLoss * 2;
      
      if (m.latency > 100) {
        healthScore -= (m.latency - 100) * 0.2;
      }
      
      if (m.dnsTime > 50) {
        healthScore -= (m.dnsTime - 50) * 0.1;
      }
      
      if (m.wifiSignal < 50) {
        healthScore -= (50 - m.wifiSignal) * 0.3;
      }

      healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

      return {
        ...m.toObject(),
        healthScore
      };
    });

    res.status(200).json({
      success: true,
      data: {
        metrics: formattedMetrics,
        diagnoses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Triggers an immediate, out-of-schedule network scan
 */
exports.scanNow = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await performScan(io);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Loopback download endpoint for custom local speed testing
 */
exports.downloadFallback = (req, res) => {
  // Output a static 1MB chunk of zeros
  const sizeBytes = 1 * 1024 * 1024;
  const chunk = Buffer.alloc(sizeBytes, '0');
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', sizeBytes);
  res.send(chunk);
};

/**
 * Loopback upload endpoint for custom local speed testing
 */
exports.uploadFallback = (req, res) => {
  res.status(200).json({ success: true, message: 'Upload stream completed successfully' });
};
