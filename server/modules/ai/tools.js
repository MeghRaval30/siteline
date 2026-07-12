const prisma = require('../../shared/prismaClient');

/** Search/filter assets */
async function queryAssets({ category, status, location, search, limit = 20 }) {
  try {
    const where = {};
    if (category) where.category = { name: { contains: category } };
    if (status) where.status = status;
    if (location) where.location = { contains: location };
    if (search) where.OR = [{ name: { contains: search } }, { asset_tag: { contains: search } }];
    const assets = await prisma.asset.findMany({ where, take: parseInt(limit), include: { category: true }, orderBy: { id: 'asc' } });
    return assets.map(a => ({ id: a.id, asset_tag: a.asset_tag, name: a.name, category: a.category?.name, status: a.status, condition: a.condition, location: a.location, is_bookable: a.is_bookable }));
  } catch (e) { return { error: e.message }; }
}

/** Full detail on one asset */
async function getAssetDetail({ asset_tag }) {
  try {
    const asset = await prisma.asset.findUnique({ where: { asset_tag }, include: { category: true, allocations: { include: { holder_user: true, allocator: true }, orderBy: { allocated_at: 'desc' }, take: 5 }, maintenance_requests: { orderBy: { created_at: 'desc' }, take: 5 } } });
    if (!asset) return { error: 'Asset not found' };
    return { id: asset.id, asset_tag: asset.asset_tag, name: asset.name, category: asset.category?.name, status: asset.status, condition: asset.condition, location: asset.location, acquisition_cost: asset.acquisition_cost, acquisition_date: asset.acquisition_date, current_allocation: asset.allocations.find(a => a.status === 'Active'), allocation_count: asset.allocations.length, maintenance_count: asset.maintenance_requests.length, recent_maintenance: asset.maintenance_requests.slice(0, 3).map(m => ({ issue: m.issue_description, priority: m.priority, status: m.status })) };
  } catch (e) { return { error: e.message }; }
}

/** Who currently holds an asset */
async function whoHasAsset({ asset_tag }) {
  try {
    const asset = await prisma.asset.findUnique({ where: { asset_tag }, include: { allocations: { where: { status: 'Active' }, include: { holder_user: true, holder_department: true } } } });
    if (!asset) return { error: 'Asset not found' };
    const alloc = asset.allocations[0];
    if (!alloc) return { asset_tag, status: asset.status, holder: 'Nobody — asset is not currently allocated' };
    return { asset_tag, holder: alloc.holder_user?.name || alloc.holder_department?.name || 'Unknown', allocated_since: alloc.allocated_at, expected_return: alloc.expected_return_date };
  } catch (e) { return { error: e.message }; }
}

/** All assets held by an employee */
async function getEmployeeAssets({ employee_name }) {
  try {
    const users = await prisma.user.findMany({ where: { name: { contains: employee_name } } });
    if (users.length === 0) return { error: `No employee found matching "${employee_name}"` };
    const allocations = await prisma.allocation.findMany({ where: { holder_user_id: { in: users.map(u => u.id) }, status: 'Active' }, include: { asset: { include: { category: true } }, holder_user: true } });
    return allocations.map(a => ({ employee: a.holder_user?.name, asset: a.asset?.name, asset_tag: a.asset?.asset_tag, category: a.asset?.category?.name, since: a.allocated_at }));
  } catch (e) { return { error: e.message }; }
}

/** Count matching assets */
async function countAssets({ category, status, location }) {
  try {
    const where = {};
    if (category) where.category = { name: { contains: category } };
    if (status) where.status = status;
    if (location) where.location = { contains: location };
    const count = await prisma.asset.count({ where });
    return { count, filters: { category, status, location } };
  } catch (e) { return { error: e.message }; }
}

/** List maintenance requests */
async function listMaintenanceRequests({ status, priority }) {
  try {
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const requests = await prisma.maintenanceRequest.findMany({ where, take: 20, include: { asset: true, raiser: true }, orderBy: { created_at: 'desc' } });
    return requests.map(r => ({ id: r.id, asset: r.asset?.name, asset_tag: r.asset?.asset_tag, issue: r.issue_description, priority: r.priority, status: r.status, raised_by: r.raiser?.name, date: r.created_at }));
  } catch (e) { return { error: e.message }; }
}

/** Get overdue allocations */
async function getOverdueAllocations() {
  try {
    const overdue = await prisma.allocation.findMany({ where: { status: 'Active', expected_return_date: { lt: new Date() } }, include: { asset: true, holder_user: true } });
    return overdue.map(a => ({ asset: a.asset?.name, asset_tag: a.asset?.asset_tag, holder: a.holder_user?.name, expected_return: a.expected_return_date, days_overdue: Math.floor((Date.now() - new Date(a.expected_return_date)) / 86400000) }));
  } catch (e) { return { error: e.message }; }
}

/** Get upcoming bookings */
async function getUpcomingBookings({ asset_tag, employee_name }) {
  try {
    const where = { start_time: { gte: new Date() } };
    if (asset_tag) where.asset = { asset_tag };
    const bookings = await prisma.booking.findMany({ where, take: 20, include: { asset: true, user: true }, orderBy: { start_time: 'asc' } });
    let result = bookings.map(b => ({ asset: b.asset?.name, asset_tag: b.asset?.asset_tag, booked_by: b.user?.name, start: b.start_time, end: b.end_time, purpose: b.purpose, status: b.status }));
    if (employee_name) result = result.filter(b => b.booked_by?.toLowerCase().includes(employee_name.toLowerCase()));
    return result;
  } catch (e) { return { error: e.message }; }
}

/** Department overview */
async function getDepartmentSummary({ department_name }) {
  try {
    const dept = await prisma.department.findFirst({ where: { name: { contains: department_name } }, include: { users: true } });
    if (!dept) return { error: `Department "${department_name}" not found` };
    const userIds = dept.users.map(u => u.id);
    const [activeAllocs, overdueAllocs, maintReqs] = await Promise.all([
      prisma.allocation.count({ where: { holder_user_id: { in: userIds }, status: 'Active' } }),
      prisma.allocation.count({ where: { holder_user_id: { in: userIds }, status: 'Active', expected_return_date: { lt: new Date() } } }),
      prisma.maintenanceRequest.count({ where: { raised_by: { in: userIds }, status: { in: ['Pending', 'Approved', 'InProgress'] } } }),
    ]);
    return { department: dept.name, employee_count: dept.users.length, employees: dept.users.map(u => u.name), active_allocations: activeAllocs, overdue_allocations: overdueAllocs, open_maintenance: maintReqs };
  } catch (e) { return { error: e.message }; }
}

/** Dashboard stats */
async function getDashboardStats() {
  try {
    const [total, available, allocated, maintenance, overdue] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'Available' } }),
      prisma.asset.count({ where: { status: 'Allocated' } }),
      prisma.asset.count({ where: { status: 'In Maintenance' } }),
      prisma.allocation.count({ where: { status: 'Active', expected_return_date: { lt: new Date() } } }),
    ]);
    return { total_assets: total, available, allocated, in_maintenance: maintenance, overdue_returns: overdue };
  } catch (e) { return { error: e.message }; }
}

/** Search across assets, users, departments */
async function searchEverything({ query }) {
  try {
    const [assets, users, depts] = await Promise.all([
      prisma.asset.findMany({ where: { OR: [{ name: { contains: query } }, { asset_tag: { contains: query } }] }, take: 5, select: { id: true, name: true, asset_tag: true, status: true } }),
      prisma.user.findMany({ where: { name: { contains: query } }, take: 5, select: { id: true, name: true, email: true, role: true } }),
      prisma.department.findMany({ where: { name: { contains: query } }, take: 5, select: { id: true, name: true } }),
    ]);
    return { assets, users, departments: depts };
  } catch (e) { return { error: e.message }; }
}

const TOOL_SCHEMAS = [
  { type: 'function', function: { name: 'query_assets', description: 'Search and filter assets by category, status, location, or search term', parameters: { type: 'object', properties: { category: { type: 'string', description: 'Asset category name' }, status: { type: 'string', description: 'Asset status', enum: ['Available', 'Allocated', 'In Maintenance', 'Retired', 'Lost'] }, location: { type: 'string' }, search: { type: 'string' }, limit: { type: 'integer', description: 'Max results (default 20)' } } } } },
  { type: 'function', function: { name: 'get_asset_detail', description: 'Get full details on a specific asset including allocation and maintenance history', parameters: { type: 'object', properties: { asset_tag: { type: 'string', description: 'The asset tag (e.g. AF-0001)' } }, required: ['asset_tag'] } } },
  { type: 'function', function: { name: 'who_has_asset', description: 'Find out who currently holds a specific asset', parameters: { type: 'object', properties: { asset_tag: { type: 'string' } }, required: ['asset_tag'] } } },
  { type: 'function', function: { name: 'get_employee_assets', description: 'Get all assets currently held by an employee (fuzzy name match)', parameters: { type: 'object', properties: { employee_name: { type: 'string' } }, required: ['employee_name'] } } },
  { type: 'function', function: { name: 'count_assets', description: 'Count assets matching filters', parameters: { type: 'object', properties: { category: { type: 'string' }, status: { type: 'string' }, location: { type: 'string' } } } } },
  { type: 'function', function: { name: 'list_maintenance_requests', description: 'List maintenance requests, optionally filtered by status and priority', parameters: { type: 'object', properties: { status: { type: 'string', enum: ['Pending', 'Approved', 'InProgress', 'Resolved', 'Rejected'] }, priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] } } } } },
  { type: 'function', function: { name: 'get_overdue_allocations', description: 'Get all assets that are past their expected return date', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_upcoming_bookings', description: 'Get upcoming asset bookings', parameters: { type: 'object', properties: { asset_tag: { type: 'string' }, employee_name: { type: 'string' } } } } },
  { type: 'function', function: { name: 'get_department_summary', description: 'Get an overview of a department including employees, assets, and maintenance', parameters: { type: 'object', properties: { department_name: { type: 'string' } }, required: ['department_name'] } } },
  { type: 'function', function: { name: 'get_dashboard_stats', description: 'Get overall dashboard statistics', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'search_everything', description: 'Search across assets, users, and departments', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
];

const TOOL_FUNCTIONS = { query_assets: queryAssets, get_asset_detail: getAssetDetail, who_has_asset: whoHasAsset, get_employee_assets: getEmployeeAssets, count_assets: countAssets, list_maintenance_requests: listMaintenanceRequests, get_overdue_allocations: getOverdueAllocations, get_upcoming_bookings: getUpcomingBookings, get_department_summary: getDepartmentSummary, get_dashboard_stats: getDashboardStats, search_everything: searchEverything };

module.exports = { TOOL_SCHEMAS, TOOL_FUNCTIONS };
