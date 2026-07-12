const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

router.get('/cycles', authenticate, auditController.listCycles);
router.post('/cycles', authenticate, requireRole(['Admin', 'AssetManager']), auditController.createCycle);
router.patch('/items/:id', authenticate, auditController.markItem);
router.post('/cycles/:id/close', authenticate, requireRole(['Admin', 'AssetManager']), auditController.closeCycle);
router.get('/cycles/:id/discrepancies', authenticate, auditController.getDiscrepancies);

module.exports = router;
