const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  targetHost: { type: String, required: true },
  latency: { type: Number, required: true },        // ms
  packetLoss: { type: Number, required: true },     // percentage (0-100)
  dnsTime: { type: Number, required: true },        // ms
  downloadSpeed: { type: Number, required: true },  // Mbps
  uploadSpeed: { type: Number, required: true },    // Mbps
  wifiSignal: { type: Number, required: true }      // percentage (0-100)
});

module.exports = mongoose.model('Metric', MetricSchema);
