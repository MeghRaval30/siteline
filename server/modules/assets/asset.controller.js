const prisma = require('../../shared/prismaClient');

const create = async (req, res, next) => {
  try {
    const { name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, is_bookable, photo_url } = req.body;
    
    // Generate Asset Tag and Create Asset in a transaction
    const newAsset = await prisma.$transaction(async (tx) => {
      // Find the latest asset to increment the tag
      const lastAsset = await tx.asset.findFirst({
        orderBy: { id: 'desc' }
      });
      
      let nextNumber = 1;
      if (lastAsset && lastAsset.asset_tag.startsWith('AF-')) {
        const lastNumber = parseInt(lastAsset.asset_tag.replace('AF-', ''), 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      const asset_tag = `AF-${String(nextNumber).padStart(4, '0')}`;
      
      const asset = await tx.asset.create({
        data: {
          asset_tag,
          name,
          category_id,
          serial_number,
          acquisition_date: acquisition_date ? new Date(acquisition_date) : null,
          acquisition_cost,
          condition,
          location,
          is_bookable: !!is_bookable,
          photo_url,
          status: 'Available'
        }
      });
      
      return asset;
    });

    res.status(201).json({ success: true, data: { asset: newAsset, asset_tag: newAsset.asset_tag }, error: null });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { status, category_id, department_id, search, page = 1, limit = 10, location } = req.query;
    
    const query = {
      where: {}
    };

    if (status) query.where.status = status;
    if (category_id) query.where.category_id = parseInt(category_id);
    if (location) query.where.location = location;

    if (search) {
      query.where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { asset_tag: { contains: search, mode: 'insensitive' } },
        { serial_number: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (department_id) {
      // Filter by current Allocation's department
      query.where.allocations = {
        some: {
          status: 'Active',
          holder_department_id: parseInt(department_id)
        }
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    query.skip = skip;
    query.take = parseInt(limit);
    
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({ ...query, include: { category: true } }),
      prisma.asset.count({ where: query.where })
    ]);

    res.json({
      success: true,
      data: assets,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
      error: null
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        allocations: {
          orderBy: { created_at: 'desc' },
          include: {
            holder_user: { select: { id: true, name: true, email: true } },
            holder_department: { select: { id: true, name: true } },
            allocator: { select: { id: true, name: true } }
          }
        },
        maintenance_requests: {
          orderBy: { created_at: 'desc' },
          include: {
            raiser: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }

    const activeAllocation = asset.allocations.find(a => a.status === 'Active');
    let current_holder = null;
    if (activeAllocation) {
      if (activeAllocation.holder_user) {
        current_holder = { type: 'User', ...activeAllocation.holder_user };
      } else if (activeAllocation.holder_department) {
        current_holder = { type: 'Department', ...activeAllocation.holder_department };
      }
    }

    // Separate asset details from relations to match API contract
    const assetData = { ...asset };
    delete assetData.allocations;
    delete assetData.maintenance_requests;

    res.json({
      success: true,
      data: {
        asset: assetData,
        current_holder,
        allocation_history: asset.allocations,
        maintenance_history: asset.maintenance_requests
      },
      error: null
    });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Prevent updating critical fields like asset_tag, status directly via this endpoint
    delete updates.asset_tag;
    delete updates.status;
    
    if (updates.acquisition_date) {
      updates.acquisition_date = new Date(updates.acquisition_date);
    }
    
    const asset = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: updates
    });

    res.json({ success: true, data: { asset }, error: null });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  list,
  getById,
  update
};
