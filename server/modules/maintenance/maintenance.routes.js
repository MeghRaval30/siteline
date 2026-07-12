const express = require('express');
const router = express.Router();
const maintenanceController = require('./maintenance.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

router.get('/', authenticate, maintenanceController.list);
router.post('/', authenticate, maintenanceController.raiseRequest);
router.post('/ai/maintenance-priority', authenticate, maintenanceController.suggestPriority);

router.post('/:id/approve', authenticate, requireRole(['Admin', 'AssetManager']), maintenanceController.approve);
router.post('/:id/reject', authenticate, requireRole(['Admin', 'AssetManager']), maintenanceController.reject);
router.patch('/:id/assign-technician', authenticate, requireRole(['Admin', 'AssetManager']), maintenanceController.assignTechnician);
router.patch('/:id/start', authenticate, requireRole(['Admin', 'AssetManager']), maintenanceController.start);
router.post('/:id/resolve', authenticate, requireRole(['Admin', 'AssetManager']), maintenanceController.resolve);

module.exports = router;
