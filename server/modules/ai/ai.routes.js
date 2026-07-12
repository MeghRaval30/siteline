const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const authenticate = require('../../shared/authenticate');

router.post('/chat', authenticate, aiController.chat);
router.post('/search', authenticate, aiController.search);
router.get('/insights', authenticate, aiController.insights);
router.post('/maintenance-priority', authenticate, aiController.maintenancePriority);

module.exports = router;
