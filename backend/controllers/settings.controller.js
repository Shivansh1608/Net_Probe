const Settings = require('../models/Settings');
const { updateSchedulerInterval } = require('../jobs/scheduler');

/**
 * Fetch the application settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Update the application settings (and reschedule the scheduler if interval changes)
 */
exports.updateSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { scanInterval, targetHosts, thresholds } = req.body;

    if (scanInterval !== undefined) {
      settings.scanInterval = scanInterval;
    }

    if (targetHosts !== undefined) {
      settings.targetHosts = targetHosts;
    }

    if (thresholds !== undefined) {
      settings.thresholds = {
        ...settings.thresholds,
        ...thresholds
      };
    }

    await settings.save();

    // Dynamically notify the scheduler of changes to the scan frequency
    const io = req.app.get('io');
    updateSchedulerInterval(io, settings.scanInterval);

    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
