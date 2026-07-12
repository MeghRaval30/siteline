const express = require('express');
const employeeController = require('./employee.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

const router = express.Router();

router.get('/', authenticate, employeeController.getEmployees);
router.post('/', authenticate, requireRole(['Admin']), employeeController.createEmployee);
router.patch('/:id/role', authenticate, requireRole(['Admin']), employeeController.updateRole);
router.patch('/:id/status', authenticate, requireRole(['Admin']), employeeController.updateStatus);

module.exports = router;
