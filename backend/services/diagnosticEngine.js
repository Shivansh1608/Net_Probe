const Metric = require('../models/Metric');
const Diagnosis = require('../models/Diagnosis');

/**
 * Runs the rule-based diagnostic engine against the latest network metric.
 * Also retrieves historical data to verify trends and recurring patterns.
 * @param {object} latestMetric - The newly collected Metric document
 * @param {object} settings - The system Settings configuration
 * @returns {Promise<{healthScore: number, issues: Array<{issueType: string, severity: string, explanation: string, suggestion: string, healthScoreImpact: number}>}>}
 */
async function diagnoseNetwork(latestMetric, settings) {
  const issues = [];
  const thresholds = settings.thresholds;

  // RULE 1 — High Packet Loss
  if (latestMetric.packetLoss > thresholds.packetLossLimit) {
    const isCritical = latestMetric.packetLoss > thresholds.packetLossCritical;
    issues.push({
      issueType: 'HIGH_PACKET_LOSS',
      severity: isCritical ? 'high' : 'medium',
      explanation: 'High packet loss detected — data packets are being dropped before reaching the destination.',
      suggestion: 'Check for Wi-Fi interference, move closer to the router, or contact your ISP if using a wired connection.',
      healthScoreImpact: Math.round((latestMetric.packetLoss * 2) * 10) / 10
    });
  }

  // RULE 2 — Slow DNS
  if (latestMetric.dnsTime > thresholds.dnsTimeLimit) {
    const impact = latestMetric.dnsTime > 50 ? (latestMetric.dnsTime - 50) * 0.1 : 0;
    issues.push({
      issueType: 'SLOW_DNS',
      severity: 'medium',
      explanation: 'DNS response time is unusually slow, adding delay before connections even start.',
      suggestion: 'Try switching DNS provider to 1.1.1.1 (Cloudflare) or 8.8.8.8 (Google).',
      healthScoreImpact: Math.round(impact * 10) / 10
    });
  }

  // RULE 3 — Weak Wi-Fi Signal
  if (latestMetric.wifiSignal < thresholds.wifiSignalLimit) {
    const impact = latestMetric.wifiSignal < 50 ? (50 - latestMetric.wifiSignal) * 0.3 : 0;
    issues.push({
      issueType: 'WEAK_WIFI',
      severity: 'medium',
      explanation: 'Wi-Fi signal strength is weak, which can cause intermittent slowdowns and drops.',
      suggestion: 'Move closer to the router, remove physical obstructions, or consider a Wi-Fi extender.',
      healthScoreImpact: Math.round(impact * 10) / 10
    });
  }

  // RULE 4 — Routing/ISP Issue (correlation rule)
  if (latestMetric.latency > thresholds.routingLatencyLimit && latestMetric.downloadSpeed > thresholds.routingSpeedLimit) {
    const impact = latestMetric.latency > 100 ? (latestMetric.latency - 100) * 0.2 : 0;
    issues.push({
      issueType: 'ROUTING_ISSUE',
      severity: 'low',
      explanation: 'Latency is high despite normal bandwidth — this points to a routing or ISP-side issue rather than your local network.',
      suggestion: 'Run a traceroute to identify the slow hop, or contact your ISP.',
      healthScoreImpact: Math.round(impact * 10) / 10
    });
  }

  // RULE 5 — Bandwidth Bottleneck (correlation rule)
  // Requires rolling average of the last 20 readings (excluding current metric)
  const historyLimit = 20;
  const recentMetrics = await Metric.find({ _id: { $ne: latestMetric._id } })
    .sort({ timestamp: -1 })
    .limit(historyLimit);

  if (recentMetrics.length > 0) {
    const avgDownload = recentMetrics.reduce((sum, m) => sum + m.downloadSpeed, 0) / recentMetrics.length;
    
    // Check if speed has dropped more than the configured percentage threshold
    const dropRatio = avgDownload > 0 ? (avgDownload - latestMetric.downloadSpeed) / avgDownload : 0;
    
    if (dropRatio > thresholds.bandwidthDropThreshold && latestMetric.latency < 100) {
      issues.push({
        issueType: 'BANDWIDTH_BOTTLENECK',
        severity: 'medium',
        explanation: 'Bandwidth has dropped significantly while latency remains normal — likely a bottleneck from background downloads, streaming, or ISP throttling, not a connectivity problem.',
        suggestion: 'Check for other devices/apps consuming bandwidth, or test at a different time of day.',
        healthScoreImpact: 10
      });
    }
  }

  // RULE 6 — Recurring Time-Based Pattern (trend rule, requires historical check in past 7 days)
  const sevenDaysAgo = new Date(latestMetric.timestamp);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Convert current timestamp to decimal hours (e.g. 19:30 -> 19.5)
  const currentHourDecimal = latestMetric.timestamp.getHours() + latestMetric.timestamp.getMinutes() / 60;
  let triggeredRecurring = false;
  let recurringType = '';

  for (const issue of issues) {
    // Find all past diagnoses of the same issueType in the last 7 days
    const pastDiagnoses = await Diagnosis.find({
      issueType: issue.issueType,
      timestamp: { $gte: sevenDaysAgo, $lt: latestMetric.timestamp }
    });

    let matches = 0;
    for (const diag of pastDiagnoses) {
      const diagHourDecimal = diag.timestamp.getHours() + diag.timestamp.getMinutes() / 60;
      let diff = Math.abs(currentHourDecimal - diagHourDecimal);
      if (diff > 12) {
        diff = 24 - diff; // handle wrapping (e.g. 23:30 vs 00:30)
      }
      if (diff <= 1.0) { // Within +/- 1 hour
        matches++;
      }
    }

    if (matches >= 3) {
      triggeredRecurring = true;
      recurringType = issue.issueType;
      break; // Limit to triggering once per scan
    }
  }

  if (triggeredRecurring) {
    issues.push({
      issueType: 'RECURRING_CONGESTION',
      severity: 'low',
      explanation: `The issue '${recurringType}' tends to recur around this time daily — likely related to peak-hour network congestion.`,
      suggestion: 'Avoid heavy usage during this time window, or discuss peak-hour throttling with your ISP.',
      healthScoreImpact: 5
    });
  }

  // Health Score calculation (formula from prompt):
  // healthScore = 100
  //   - (packetLoss * 2)
  //   - (latency > 100 ? (latency - 100) * 0.2 : 0)
  //   - (dnsTime > 50 ? (dnsTime - 50) * 0.1 : 0)
  //   - (wifiSignal < 50 ? (50 - wifiSignal) * 0.3 : 0)
  let healthScore = 100;
  
  healthScore -= latestMetric.packetLoss * 2;
  
  if (latestMetric.latency > 100) {
    healthScore -= (latestMetric.latency - 100) * 0.2;
  }
  
  if (latestMetric.dnsTime > 50) {
    healthScore -= (latestMetric.dnsTime - 50) * 0.1;
  }
  
  if (latestMetric.wifiSignal < 50) {
    healthScore -= (50 - latestMetric.wifiSignal) * 0.3;
  }

  // Clamp health score between 0 and 100
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  return {
    healthScore,
    issues
  };
}

module.exports = { diagnoseNetwork };
