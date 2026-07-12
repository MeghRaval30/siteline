const express = require('express');
const router = express.Router();
const assetController = require('./asset.controller');
const authenticate = require('../../shared/authenticate');
const requireRole = require('../../shared/requireRole');

// Validation middleware could be added here
const validate = (schema) => (req, res, next) => next();

router.post('/', authenticate, requireRole(['Admin', 'AssetManager']), validate('createAssetSchema'), assetController.create);
router.get('/', authenticate, assetController.list);
router.get('/:id', authenticate, assetController.getById);
router.put('/:id', authenticate, requireRole(['Admin', 'AssetManager']), assetController.update);

module.exports = router;
