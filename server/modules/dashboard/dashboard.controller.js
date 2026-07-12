const prisma = require('../../shared/prismaClient');

const getKPIs = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Run aggregations concurrently
    const [
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturnsResult,
      overdueReturnsList
    ] = await Promise.all([
      prisma.asset.count({ where: { status: 'Available' } }),
      prisma.asset.count({ where: { status: 'Allocated' } }),
      prisma.maintenanceRequest.count({
        where: { status: { in: ['Approved', 'TechnicianAssigned', 'InProgress'] } }
      }),
      prisma.booking.count({
        where: { status: { in: ['Upcoming', 'Ongoing'] } }
      }),
      prisma.transferRequest.count({ where: { status: 'Requested' } }),
      prisma.allocation.count({
        where: {
          status: 'Active',
          expected_return_date: {
            gte: today,
            lte: sevenDaysFromNow
          }
        }
      }),
      prisma.allocation.findMany({
        where: {
          status: 'Active',
          expected_return_date: {
            lt: today
          }
        },
        include: {
          asset: { select: { asset_tag: true } },
          holder_user: { select: { name: true } }
        }
      })
    ]);

    const overdueReturns = overdueReturnsList.map(item => ({
      asset_tag: item.asset?.asset_tag,
      holder_name: item.holder_user?.name,
      expected_return_date: item.expected_return_date
    }));

    return res.status(200).json({
      success: true,
      data: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        upcomingReturns: upcomingReturnsResult,
        overdueReturns
      }
    });
  } catch (error) {
    console.error('getKPIs error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const activities = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        actor: { select: { name: true } }
      }
    });

    const formattedActivities = activities.map(act => ({
      id: act.id,
      action: act.action,
      user: act.actor ? act.actor.name : 'System',
      item: act.metadata ? act.metadata : (act.entity_type || '-'),
      date: act.created_at.toISOString().split('T')[0]
    }));

    return res.status(200).json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    console.error('getRecentActivity error:', error);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

module.exports = {
  getKPIs,
  getRecentActivity
};
