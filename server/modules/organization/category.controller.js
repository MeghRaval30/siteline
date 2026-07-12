const prisma = require('../../shared/prismaClient');
const logActivity = require('../../shared/logActivity');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany();
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await prisma.assetCategory.create({
      data: { name, description }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'CREATE_CATEGORY',
      entityType: 'AssetCategory',
      entityId: category.id,
      metadata: { name: category.name }
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('createCategory error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'CATEGORY_NAME_EXISTS' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.assetCategory.update({
      where: { id: parseInt(id) },
      data: { name, description }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'UPDATE_CATEGORY',
      entityType: 'AssetCategory',
      entityId: category.id,
      metadata: { updates: { name, description } }
    });

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error('updateCategory error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // check if referenced by assets
    const assetCount = await prisma.asset.count({
      where: { category_id: parseInt(id) }
    });

    if (assetCount > 0) {
      return res.status(400).json({ success: false, error: 'CATEGORY_IN_USE', message: 'Cannot delete category that is referenced by assets' });
    }

    const category = await prisma.assetCategory.delete({
      where: { id: parseInt(id) }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'DELETE_CATEGORY',
      entityType: 'AssetCategory',
      entityId: category.id,
      metadata: { name: category.name }
    });

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    console.error('deleteCategory error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
