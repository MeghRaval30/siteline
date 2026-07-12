const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const authenticate = require('../../shared/authenticate');

router.post('/', authenticate, bookingController.create);
router.get('/', authenticate, bookingController.list);
router.post('/:id/cancel', authenticate, bookingController.cancel);

module.exports = router;
