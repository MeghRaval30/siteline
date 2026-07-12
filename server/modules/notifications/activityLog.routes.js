const express = require('express');
const router = express.Router();
const activityLogController = require('./activityLog.controller');
const authenticate = require('../../shared/authenticate');

router.get('/', authenticate, activityLogController.list);

module.exports = router;
