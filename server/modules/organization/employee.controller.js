const prisma = require('../../shared/prismaClient');
const logActivity = require('../../shared/logActivity');

const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: { select: { id: true, name: true } },
        role: true,
        status: true,
        created_at: true
      }
    });
    return res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error('getEmployees error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['DepartmentHead', 'AssetManager'].includes(role)) {
      return res.status(400).json({ success: false, error: 'INVALID_ROLE' });
    }

    const employee = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'PROMOTE_EMPLOYEE',
      entityType: 'User',
      entityId: employee.id,
      metadata: { new_role: role }
    });

    return res.status(200).json({ success: true, data: { user: employee } });
  } catch (error) {
    console.error('updateRole error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'INVALID_STATUS' });
    }

    const employee = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status },
      select: { id: true, name: true, email: true, status: true }
    });

    await logActivity({
      actorUserId: req.user.id,
      action: 'UPDATE_EMPLOYEE_STATUS',
      entityType: 'User',
      entityId: employee.id,
      metadata: { new_status: status }
    });

    return res.status(200).json({ success: true, data: { user: employee } });
  } catch (error) {
    console.error('updateStatus error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

module.exports = {
  getEmployees,
  updateRole,
  updateStatus
};
