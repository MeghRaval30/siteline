const express = require('express');
const categoryController = require('./category.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

const router = express.Router();

router.get('/', authenticate, categoryController.getCategories);
router.post('/', authenticate, requireRole(['Admin']), categoryController.createCategory);
router.put('/:id', authenticate, requireRole(['Admin']), categoryController.updateCategory);
router.delete('/:id', authenticate, requireRole(['Admin']), categoryController.deleteCategory);

module.exports = router;
