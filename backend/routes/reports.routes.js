const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

// List, generate, and download reports
router.get('/', reportsController.listReports);
router.post('/generate', reportsController.generateReport);
router.get('/:id/download', reportsController.downloadReport);

module.exports = router;
