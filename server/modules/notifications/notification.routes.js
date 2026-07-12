const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const authenticate = require('../../shared/authenticate');

router.get('/', authenticate, notificationController.list);
router.patch('/read-all', authenticate, notificationController.markAllRead);
router.patch('/:id/read', authenticate, notificationController.markRead);

module.exports = router;
