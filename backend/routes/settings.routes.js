const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

// GET settings & PUT/update settings
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;
