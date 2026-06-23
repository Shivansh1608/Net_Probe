const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  generatedAt: { type: Date, default: Date.now },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  summary: { type: String, required: true },
  avgHealthScore: { type: Number, required: true },
  filePath: { type: String, required: true }
});

module.exports = mongoose.model('Report', ReportSchema);
