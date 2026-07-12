const express = require('express');
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../shared/authenticate');

const router = express.Router();

router.get('/kpis', authenticate, dashboardController.getKPIs);
router.get('/recent-activity', authenticate, dashboardController.getRecentActivity);

module.exports = router;
