require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Metric = require('../models/Metric');
const Diagnosis = require('../models/Diagnosis');
const Settings = require('../models/Settings');
const { diagnoseNetwork } = require('../services/diagnosticEngine');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/network-analyzer';

async function seed() {
  console.log(`Connecting to MongoDB at ${MONGO_URI} for seeding...`);
  await mongoose.connect(MONGO_URI);
  
  // Clear any existing metrics and diagnoses to start clean
  await Metric.deleteMany({});
  await Diagnosis.deleteMany({});
  
  // Ensure default settings exist
  const settings = await Settings.getSettings();

  const now = new Date();
  const metricsToInsert = [];

  console.log('Generating 25 historical hourly performance records...');

  for (let i = 24; i >= 0; i--) {
    // Hour increment (offset from now)
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    
    // Baseline healthy metrics
    let latency = 20 + Math.random() * 10;      // 20 - 30 ms
    let packetLoss = 0;                         // 0% loss
    let dnsTime = 15 + Math.random() * 15;      // 15 - 30 ms
    let downloadSpeed = 45 + Math.random() * 10; // 45 - 55 Mbps
    let uploadSpeed = 15 + Math.random() * 3;   // 15 - 18 Mbps
    let wifiSignal = 85 + Math.round(Math.random() * 10); // 85 - 95 %

    // Inject simulated anomalies to test diagnostic rules:

    // Case A: 18 hours ago - High Packet Loss (Rule 1)
    if (i === 18) {
      packetLoss = 12; // triggers medium packet loss rule
      wifiSignal = 55;
    }

    // Case B: 12 hours ago - Slow DNS (Rule 2) and Weak Wi-Fi (Rule 3)
    if (i === 12) {
      dnsTime = 160;   // triggers slow dns rule (>100)
      wifiSignal = 35; // triggers weak wifi rule (<40)
    }

    // Case C: 6 hours ago - Routing High Latency (Rule 4)
    if (i === 6) {
      latency = 180;        // high latency (>150)
      downloadSpeed = 35;   // normal bandwidth (>20)
    }

    // Case D: 3 hours ago - Bandwidth Bottleneck (Rule 5)
    if (i === 3) {
      downloadSpeed = 10; // Drop of ~80% compared to typical 45-55Mbps rolling average
      latency = 25;       // normal latency
    }

    // Case E: Inject repetitive slow DNS at similar hours on previous days (Rule 6 recurring pattern checks)
    // We will append a few extra historical metrics at the end of the script to simulate this.

    const metricDoc = new Metric({
      timestamp,
      targetHost: settings.targetHosts[0] || '8.8.8.8',
      latency: Math.round(latency * 10) / 10,
      packetLoss: Math.round(packetLoss * 10) / 10,
      dnsTime: Math.round(dnsTime),
      downloadSpeed: Math.round(downloadSpeed * 100) / 100,
      uploadSpeed: Math.round(uploadSpeed * 100) / 100,
      wifiSignal
    });

    await metricDoc.save();
    metricsToInsert.push(metricDoc);
  }

  // Inject recurring issues in past 7 days to trigger Rule 6 (congestion)
  // Let's add 3 slow DNS issues occurring daily at the exact same hour window (+/- 30 mins)
  console.log('Injecting historical daily DNS events to satisfy Rule 6 recurring congestion checks...');
  const baseHour = now.getHours();

  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const historicalTime = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    historicalTime.setHours(baseHour, Math.round(Math.random() * 20), 0); // similar hour window

    const recurringMetric = new Metric({
      timestamp: historicalTime,
      targetHost: settings.targetHosts[0] || '8.8.8.8',
      latency: 22,
      packetLoss: 0,
      dnsTime: 180, // slow DNS
      downloadSpeed: 48,
      uploadSpeed: 16,
      wifiSignal: 90
    });

    await recurringMetric.save();
    
    // Diagnose and log immediately so we have past Diagnoses in the DB
    const { issues } = await diagnoseNetwork(recurringMetric, settings);
    for (const issue of issues) {
      const diag = new Diagnosis({
        timestamp: recurringMetric.timestamp,
        metricId: recurringMetric._id,
        issueType: issue.issueType,
        severity: issue.severity,
        explanation: issue.explanation,
        suggestion: issue.suggestion,
        healthScoreImpact: issue.healthScoreImpact
      });
      await diag.save();
    }
  }

  console.log('Running diagnostic engine evaluations on seeded 24h timeline...');
  
  // Now evaluate the main 24h timeline in chronological order
  for (const metric of metricsToInsert) {
    const { issues } = await diagnoseNetwork(metric, settings);
    
    for (const issue of issues) {
      const diag = new Diagnosis({
        timestamp: metric.timestamp,
        metricId: metric._id,
        issueType: issue.issueType,
        severity: issue.severity,
        explanation: issue.explanation,
        suggestion: issue.suggestion,
        healthScoreImpact: issue.healthScoreImpact
      });
      await diag.save();
    }
  }

  console.log('Database seeding successfully finished.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Database seeding failed with error:', err);
  process.exit(1);
});
