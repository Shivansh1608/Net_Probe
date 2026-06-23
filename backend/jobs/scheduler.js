const cron = require('node-cron');
const Settings = require('../models/Settings');
const Metric = require('../models/Metric');
const Diagnosis = require('../models/Diagnosis');
const { pingHost } = require('../services/pingService');
const { measureDNSTime } = require('../services/dnsService');
const { testBandwidth } = require('../services/bandwidthService');
const { getWifiSignal } = require('../services/wifiService');
const { diagnoseNetwork } = require('../services/diagnosticEngine');

let activeCronJob = null;
let currentIntervalMinutes = null;

/**
 * Executes a single network performance scan cycle.
 * Invokes all network probes, writes metrics to MongoDB,
 * runs the diagnostic rules, logs issues, and triggers a Socket.io broadcast.
 * @param {object} io - Socket.io server instance
 * @returns {Promise<object>} - Scan execution results
 */
async function performScan(io) {
  try {
    console.log('--- Network Performance Scan Initiated ---');
    const settings = await Settings.getSettings();
    const primaryHost = settings.targetHosts[0] || '8.8.8.8';

    // Base URL of the local server to use for download/upload fallback tests
    const localBaseUrl = `http://localhost:${process.env.PORT || 5000}`;

    // Execute all network checks in parallel to minimize total scan latency
    const [pingResults, dnsTime, wifiSignal, bandwidth] = await Promise.all([
      pingHost(primaryHost, settings.pingPacketsCount || 4),
      measureDNSTime('google.com'),
      getWifiSignal(85), // Default fallback if hardware check is unavailable
      testBandwidth(localBaseUrl)
    ]);

    // Construct the Metric entry
    const newMetric = new Metric({
      targetHost: primaryHost,
      latency: pingResults.latency,
      packetLoss: pingResults.packetLoss,
      dnsTime,
      downloadSpeed: bandwidth.downloadSpeed,
      uploadSpeed: bandwidth.uploadSpeed,
      wifiSignal
    });

    await newMetric.save();
    console.log(`Saved Metric: Latency=${newMetric.latency}ms, Loss=${newMetric.packetLoss}%, DNS=${newMetric.dnsTime}ms, Down=${newMetric.downloadSpeed}Mbps, Up=${newMetric.uploadSpeed}Mbps`);

    // Run the Diagnostic Engine
    const { healthScore, issues } = await diagnoseNetwork(newMetric, settings);
    console.log(`Diagnosis: Calculated Health Score = ${healthScore}%, Issues Detected = ${issues.length}`);

    // Save each diagnosed issue
    const savedDiagnoses = [];
    for (const issue of issues) {
      const diag = new Diagnosis({
        metricId: newMetric._id,
        issueType: issue.issueType,
        severity: issue.severity,
        explanation: issue.explanation,
        suggestion: issue.suggestion,
        healthScoreImpact: issue.healthScoreImpact
      });
      await diag.save();
      savedDiagnoses.push(diag);
    }

    const scanResult = {
      metric: newMetric,
      healthScore,
      diagnoses: savedDiagnoses
    };

    // Emit live scan updates to all connected Socket.io clients
    if (io) {
      io.emit('metric:new', scanResult);
      console.log('Socket.io: Emitted live scan details to client subscribers');
    }

    console.log('--- Scan Cycle Completed ---');
    return scanResult;
  } catch (err) {
    console.error('Network performance scan execution failed:', err);
    throw err;
  }
}

/**
 * Initializes and starts the background polling scheduler.
 * @param {object} io - Socket.io server instance
 */
function startScheduler(io) {
  Settings.getSettings().then(settings => {
    const interval = settings.scanInterval || 5;
    scheduleJob(io, interval);
  }).catch(err => {
    console.error('Failed to load settings during scheduler boot, scheduling default 5 min interval:', err);
    scheduleJob(io, 5);
  });
}

/**
 * Setup/reset the node-cron task.
 * @param {object} io 
 * @param {number} minutes 
 */
function scheduleJob(io, minutes) {
  if (activeCronJob) {
    activeCronJob.stop();
    console.log('Stopped current active scan scheduler job.');
  }

  currentIntervalMinutes = minutes;
  // node-cron pattern to execute every X minutes
  const cronExpression = `*/${minutes} * * * *`;

  console.log(`Starting scan scheduler. Running every ${minutes} minute(s) (${cronExpression}).`);
  
  activeCronJob = cron.schedule(cronExpression, () => {
    performScan(io).catch(err => {
      console.error('Scheduled network scanning cron failed:', err);
    });
  });
}

module.exports = {
  startScheduler,
  performScan,
  updateSchedulerInterval: (io, minutes) => {
    if (minutes !== currentIntervalMinutes) {
      console.log(`Scan interval changed. Rescheduling to: ${minutes} minute(s).`);
      scheduleJob(io, minutes);
    }
  }
};
