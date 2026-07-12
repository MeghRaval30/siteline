const express = require('express');
const router = express.Router();
const allocationController = require('./allocation.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

// Asset allocation endpoints
router.post('/assets/:id/allocate', authenticate, requireRole(['Admin', 'AssetManager']), allocationController.allocate);
router.post('/assets/:id/transfer-requests', authenticate, allocationController.createTransferRequest);

// Transfer request endpoints
router.post('/transfer-requests/:id/approve', authenticate, requireRole(['Admin', 'AssetManager', 'DepartmentHead']), allocationController.approveTransferRequest);
router.post('/transfer-requests/:id/reject', authenticate, requireRole(['Admin', 'AssetManager', 'DepartmentHead']), allocationController.rejectTransferRequest);

// Allocation endpoints
router.post('/allocations/:id/return', authenticate, requireRole(['Admin', 'AssetManager']), allocationController.returnAllocation);

module.exports = router;
