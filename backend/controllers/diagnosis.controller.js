const Diagnosis = require('../models/Diagnosis');

/**
 * Returns a list of recent network issues triggered by the diagnostic engine.
 * Supports pagination parameters: ?page=1&limit=20
 */
exports.getRecentDiagnosis = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Retrieve recent diagnoses and reference their corresponding raw metric scans
    const diagnoses = await Diagnosis.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('metricId');

    const total = await Diagnosis.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        diagnoses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
