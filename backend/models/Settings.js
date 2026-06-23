const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  scanInterval: { type: Number, default: 5 }, // in minutes
  targetHosts: { type: [String], default: ['8.8.8.8', '1.1.1.1', 'github.com'] },
  thresholds: {
    packetLossLimit: { type: Number, default: 5 }, // in %
    packetLossCritical: { type: Number, default: 15 }, // in %
    dnsTimeLimit: { type: Number, default: 100 }, // in ms
    wifiSignalLimit: { type: Number, default: 40 }, // in %
    routingLatencyLimit: { type: Number, default: 150 }, // in ms
    routingSpeedLimit: { type: Number, default: 20 }, // in Mbps
    bandwidthDropThreshold: { type: Number, default: 0.4 } // 40% drop
  }
}, { timestamps: true });

// Ensure a single settings document is used
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', SettingsSchema);
