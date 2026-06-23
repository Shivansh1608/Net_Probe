const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');

// GET endpoints
router.get('/latest', metricsController.getLatestMetric);
router.get('/history', metricsController.getMetricsHistory);

// Trigger a manual network performance scan
router.post('/scan-now', metricsController.scanNow);

// Loopback network testing utilities
router.get('/test-download-fallback', metricsController.downloadFallback);
router.post('/test-upload-fallback', metricsController.uploadFallback);

module.exports = router;
