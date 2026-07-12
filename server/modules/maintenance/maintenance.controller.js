const prisma = require('../../shared/prismaClient');

const list = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const requests = await prisma.maintenanceRequest.findMany({
      where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
      include: { asset: { select: { id: true, name: true, asset_tag: true } }, raiser: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

const raiseRequest = async (req, res, next) => {
  try {
    const { asset_id, issue_description, priority, photo_url } = req.body;
    
    const request = await prisma.maintenanceRequest.create({
      data: {
        asset_id: parseInt(asset_id),
        raised_by: req.user.id,
        issue_description,
        priority: priority || 'Medium',
        photo_url,
        status: 'Pending'
      }
    });

    res.status(201).json({ success: true, data: request, error: null });
  } catch (err) {
    next(err);
  }
};

const suggestPriority = async (req, res, next) => {
  try {
    const { issue_description } = req.body;
    
    // In a real implementation, call Gemini API here.
    // For now, simple mock logic
    let suggestedPriority = 'Low';
    const lowerDesc = (issue_description || '').toLowerCase();
    
    if (lowerDesc.includes('broken') || lowerDesc.includes('critical') || lowerDesc.includes('urgent') || lowerDesc.includes('fire')) {
      suggestedPriority = 'High';
    } else if (lowerDesc.includes('issue') || lowerDesc.includes('noise') || lowerDesc.includes('slow')) {
      suggestedPriority = 'Medium';
    }

    res.json({ success: true, data: { suggested_priority: suggestedPriority }, error: null });
  } catch (err) {
    next(err);
  }
};

const approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id: parseInt(id) },
        include: { asset: true }
      });

      if (!request || request.status !== 'Pending') {
        throw new Error('INVALID_REQUEST');
      }

      if (request.asset.status === 'Under Maintenance') {
        throw new Error('ALREADY_MAINTENANCE');
      }

      await tx.asset.update({
        where: { id: request.asset_id },
        data: {
          pre_maintenance_status: request.asset.status,
          status: 'Under Maintenance'
        }
      });

      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'Approved',
          approved_by: req.user.id
        }
      });

      return updatedRequest;
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    if (err.message === 'INVALID_REQUEST') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Request not found or not pending' } });
    }
    if (err.message === 'ALREADY_MAINTENANCE') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_MAINTENANCE', message: 'Asset is already under maintenance' } });
    }
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejected_reason } = req.body;

    const updated = await prisma.maintenanceRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Rejected',
        approved_by: req.user.id,
        rejected_reason
      }
    });

    res.json({ success: true, data: updated, error: null });
  } catch (err) {
    next(err);
  }
};

const assignTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { technician_name } = req.body;

    const updated = await prisma.maintenanceRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'TechnicianAssigned',
        technician_name
      }
    });

    res.json({ success: true, data: updated, error: null });
  } catch (err) {
    next(err);
  }
};

const start = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updated = await prisma.maintenanceRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'InProgress'
      }
    });

    res.json({ success: true, data: updated, error: null });
  } catch (err) {
    next(err);
  }
};

const resolve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id: parseInt(id) },
        include: { asset: true }
      });

      if (!request) {
        throw new Error('NOT_FOUND');
      }

      await tx.asset.update({
        where: { id: request.asset_id },
        data: {
          status: request.asset.pre_maintenance_status || 'Available',
          pre_maintenance_status: null
        }
      });

      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'Resolved',
          resolution_notes,
          resolved_at: new Date()
        }
      });

      return updatedRequest;
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
    }
    next(err);
  }
};

module.exports = {
  list,
  raiseRequest,
  suggestPriority,
  approve,
  reject,
  assignTechnician,
  start,
  resolve
};
