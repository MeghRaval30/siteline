const prisma = require('../../shared/prismaClient');
const logActivity = require('../../shared/logActivity');

const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head_user: { select: { id: true, name: true, email: true } }
      }
    });
    return res.status(200).json({ success: true, data: departments });
  } catch (error) {
    console.error('getDepartments error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, head_user_id, status } = req.body;
    const department = await prisma.department.create({
      data: {
        name,
        head_user_id,
        status: status || 'Active'
      },
      include: {
        head_user: { select: { id: true, name: true, email: true } }
      }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      metadata: { name: department.name }
    });

    return res.status(201).json({ success: true, data: department });
  } catch (error) {
    console.error('createDepartment error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'DEPARTMENT_NAME_EXISTS' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, head_user_id, status } = req.body;

    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: { name, head_user_id, status },
      include: {
        head_user: { select: { id: true, name: true, email: true } }
      }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      metadata: { updates: { name, head_user_id, status } }
    });

    return res.status(200).json({ success: true, data: department });
  } catch (error) {
    console.error('updateDepartment error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete -> status=Inactive
    const department = await prisma.department.update({
      where: { id: parseInt(id) },
      data: { status: 'Inactive' }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'DEACTIVATE_DEPARTMENT',
      entityType: 'Department',
      entityId: department.id,
      metadata: { name: department.name }
    });

    return res.status(200).json({ success: true, data: department });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
