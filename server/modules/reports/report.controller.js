const prisma = require('../../shared/prismaClient');

const getReportData = async (req, res, next) => {
  try {
    const [byCategory, byStatus, byCondition, byLocationRaw, deptAllocationsRaw] = await Promise.all([
      prisma.asset.groupBy({ by: ['category_id'], _count: { id: true } }),
      prisma.asset.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.asset.groupBy({ by: ['condition'], _count: { id: true } }),
      prisma.asset.groupBy({ by: ['location'], _count: { id: true } }),
      prisma.allocation.groupBy({ by: ['holder_department_id'], _count: { id: true }, where: { status: 'Active', holder_department_id: { not: null } } })
    ]);

    // Enhance category data
    const categories = await prisma.assetCategory.findMany();
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const categoryEnhanced = byCategory.map(c => ({ name: categoryMap[c.category_id] || 'Unknown', count: c._count.id }));

    // Enhance dept data
    const depts = await prisma.department.findMany();
    const deptMap = Object.fromEntries(depts.map(d => [d.id, d.name]));
    const deptEnhanced = deptAllocationsRaw.map(d => ({ department: deptMap[d.holder_department_id] || 'Unknown', count: d._count.id }));

    res.json({
      success: true,
      data: {
        byCategory: categoryEnhanced,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
        byCondition: byCondition.map(c => ({ condition: c.condition, count: c._count.id })),
        byLocation: byLocationRaw.filter(l => l.location).map(l => ({ location: l.location, count: l._count.id })),
        deptAllocations: deptEnhanced
      }
    });
  } catch (error) {
    next(error);
  }
};

const getDepartmentAllocation = async (req, res, next) => {
  try {
    const depts = await prisma.department.findMany({
      include: { _count: { select: { allocations: { where: { status: 'Active' } } } } }
    });
    const data = depts.map(d => ({ department: d.name, count: d._count.allocations })).sort((a,b) => b.count - a.count);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const getMaintenanceFrequency = async (req, res, next) => {
  try {
    // Basic aggregation
    const maint = await prisma.maintenanceRequest.groupBy({
      by: ['priority'],
      _count: { id: true }
    });
    res.json({ success: true, data: maint.map(m => ({ priority: m.priority, count: m._count.id })) });
  } catch (error) { next(error); }
};

module.exports = {
  getReportData,
  getDepartmentAllocation,
  getMaintenanceFrequency
};
