const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const authenticate = require('../../shared/authenticate');

router.get('/utilization', authenticate, reportController.utilization);
router.get('/maintenance-frequency', authenticate, reportController.maintenanceFrequency);
router.get('/department-allocation', authenticate, reportController.departmentAllocation);
router.get('/booking-summary', authenticate, reportController.bookingSummary);

module.exports = router;
