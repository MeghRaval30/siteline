const express = require('express');
const router = express.Router();
const reportController = require('./report.controller');
const authenticate = require('../../shared/authenticate');

router.get('/', authenticate, reportController.getReportData);
router.get('/maintenance-frequency', authenticate, reportController.getMaintenanceFrequency);
router.get('/department-allocation', authenticate, reportController.getDepartmentAllocation);

module.exports = router;
