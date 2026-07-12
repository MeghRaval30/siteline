const prisma = require('../../shared/prismaClient');

exports.list = async (req, res) => {
  try {
    const reports = [
      { id: 1, name: 'Asset Utilization Report', type: 'PDF', generatedAt: new Date() },
      { id: 2, name: 'Maintenance Frequency Report', type: 'CSV', generatedAt: new Date() },
      { id: 3, name: 'Department Allocation Summary', type: 'PDF', generatedAt: new Date() },
      { id: 4, name: 'Booking Summary Report', type: 'Excel', generatedAt: new Date() }
    ];
    res.json({ success: true, data: reports, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.utilization = async (req, res) => {
  try {
    const allocations = await prisma.allocation.groupBy({
      by: ['asset_id'],
      _count: { asset_id: true },
      orderBy: { _count: { asset_id: 'desc' } }
    });
    res.json({ data: allocations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.maintenanceFrequency = async (req, res) => {
  try {
    const results = await prisma.$queryRaw`
      SELECT a.category_id, COUNT(mr.id) as count
      FROM "MaintenanceRequest" mr
      JOIN "Asset" a ON mr.asset_id = a.id
      GROUP BY a.category_id
      ORDER BY count DESC
    `;
    
    const formatted = results.map(r => ({
      category_id: r.category_id,
      count: Number(r.count)
    }));

    res.json({ data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.departmentAllocation = async (req, res) => {
  try {
    const allocations = await prisma.allocation.groupBy({
      by: ['holder_department_id'],
      _count: { holder_department_id: true },
      where: { holder_department_id: { not: null } }
    });
    res.json({ data: allocations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.bookingSummary = async (req, res) => {
  try {
    const bookings = await prisma.booking.groupBy({
      by: ['asset_id'],
      _count: { asset_id: true }
    });
    res.json({ data: bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
