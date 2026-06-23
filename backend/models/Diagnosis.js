const mongoose = require('mongoose');

const DiagnosisSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  metricId: { type: mongoose.Schema.Types.ObjectId, ref: 'Metric', required: true },
  issueType: { 
    type: String, 
    required: true,
    enum: ['HIGH_PACKET_LOSS', 'SLOW_DNS', 'WEAK_WIFI', 'ROUTING_ISSUE', 'BANDWIDTH_BOTTLENECK', 'RECURRING_CONGESTION']
  },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  explanation: { type: String, required: true },
  suggestion: { type: String, required: true },
  healthScoreImpact: { type: Number, required: true }
});

module.exports = mongoose.model('Diagnosis', DiagnosisSchema);
