const express = require('express');
const router = express.Router();
const diagnosisController = require('../controllers/diagnosis.controller');

// GET endpoint to fetch recent diagnosis logs
router.get('/recent', diagnosisController.getRecentDiagnosis);

module.exports = router;
