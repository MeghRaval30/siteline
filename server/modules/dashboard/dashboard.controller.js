const prisma = require('../../shared/prismaClient');

const getDashboardStats = async (req, res, next) => {
  try {
    const [totalAssets, availableAssets, allocatedAssets, inMaintenance, overdueReturns, totalUsers, totalDepartments, activeBookings, pendingTransfers] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'Available' } }),
      prisma.asset.count({ where: { status: 'Allocated' } }),
      prisma.asset.count({ where: { status: 'In Maintenance' } }),
      prisma.allocation.count({ where: { status: 'Active', expected_return_date: { lt: new Date() } } }),
      prisma.user.count(),
      prisma.department.count(),
      prisma.booking.count({ where: { status: 'Confirmed', start_time: { lte: new Date() }, end_time: { gte: new Date() } } }),
      prisma.transferRequest.count({ where: { status: 'Pending' } })
    ]);

    const recentActivity = await prisma.activityLog.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: { actor: { select: { name: true } } }
    });

    res.json({
      success: true,
      data: {
        totalAssets, availableAssets, allocatedAssets, inMaintenance, overdueReturns, totalUsers, totalDepartments, activeBookings, pendingTransfers,
        recentActivity: recentActivity.map(a => ({
          id: a.id, action: a.action,
          actor_name: a.actor?.name || 'System',
          entity_type: a.entity_type, entity_id: a.entity_id,
          created_at: a.created_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRecentActivities = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const activities = await prisma.activityLog.findMany({
      take: parseInt(limit),
      orderBy: { created_at: 'desc' },
      include: { actor: { select: { name: true, role: true } } }
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities
};
