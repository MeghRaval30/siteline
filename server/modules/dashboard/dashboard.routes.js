const express = require('express');
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../shared/authenticate');

const router = express.Router();

router.get('/stats', authenticate, dashboardController.getDashboardStats);
router.get('/activities', authenticate, dashboardController.getRecentActivities);

module.exports = router;
