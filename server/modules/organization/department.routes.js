const express = require('express');
const departmentController = require('./department.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

const router = express.Router();

router.get('/', authenticate, departmentController.getDepartments);
router.post('/', authenticate, requireRole(['Admin']), departmentController.createDepartment);
router.put('/:id', authenticate, requireRole(['Admin']), departmentController.updateDepartment);
router.delete('/:id', authenticate, requireRole(['Admin']), departmentController.deleteDepartment);

module.exports = router;
