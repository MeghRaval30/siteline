const prisma = require('../../shared/prismaClient');

const allocate = async (req, res, next) => {
  try {
    const { id: asset_id } = req.params;
    const { holder_user_id, holder_department_id, expected_return_date, condition_at_checkout } = req.body;

    if ((holder_user_id && holder_department_id) || (!holder_user_id && !holder_department_id)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Exactly one of holder_user_id or holder_department_id must be set' }});
    }

    // Run in transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { id: parseInt(asset_id) },
        include: {
          allocations: {
            where: { status: 'Active' },
            include: { holder_user: true, holder_department: true }
          }
        }
      });

      if (!asset) {
        throw new Error('NOT_FOUND');
      }

      if (asset.status !== 'Available') {
        const current_holder = asset.allocations[0];
        let holder_name = '';
        let holder_type = '';
        if (current_holder) {
          if (current_holder.holder_user) {
            holder_name = current_holder.holder_user.name;
            holder_type = 'User';
          } else if (current_holder.holder_department) {
            holder_name = current_holder.holder_department.name;
            holder_type = 'Department';
          }
        }
        
        throw { 
          status: 409, 
          code: 'ASSET_ALREADY_ALLOCATED', 
          message: 'Asset is already allocated', 
          data: { current_holder_name: holder_name, current_holder_type: holder_type }
        };
      }

      const allocation = await tx.allocation.create({
        data: {
          asset_id: parseInt(asset_id),
          holder_user_id: holder_user_id ? parseInt(holder_user_id) : null,
          holder_department_id: holder_department_id ? parseInt(holder_department_id) : null,
          allocated_by: req.user.id,
          expected_return_date: expected_return_date ? new Date(expected_return_date) : null,
          condition_at_checkout,
          status: 'Active'
        }
      });

      await tx.asset.update({
        where: { id: parseInt(asset_id) },
        data: { status: 'Allocated' }
      });

      return allocation;
    });

    res.status(201).json({ success: true, data: result, error: null });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, data: err.data, error: { code: err.code, message: err.message } });
    }
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }
    next(err);
  }
};

const createTransferRequest = async (req, res, next) => {
  try {
    const { id: asset_id } = req.params;
    const { requested_to_user_id, requested_to_department_id, notes } = req.body;

    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(asset_id) },
      include: {
        allocations: {
          where: { status: 'Active' }
        }
      }
    });

    if (!asset || asset.status !== 'Allocated' || asset.allocations.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Asset must be Allocated to request a transfer' } });
    }

    const currentAllocation = asset.allocations[0];

    const transferRequest = await prisma.transferRequest.create({
      data: {
        asset_id: parseInt(asset_id),
        from_allocation_id: currentAllocation.id,
        requested_to_user_id: requested_to_user_id ? parseInt(requested_to_user_id) : null,
        requested_to_department_id: requested_to_department_id ? parseInt(requested_to_department_id) : null,
        requested_by: req.user.id,
        notes,
        status: 'Pending'
      }
    });

    res.status(201).json({ success: true, data: transferRequest, error: null });
  } catch (err) {
    next(err);
  }
};

const approveTransferRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.transferRequest.findUnique({
        where: { id: parseInt(id) },
        include: { from_allocation: true }
      });

      if (!request || request.status !== 'Pending') {
        throw new Error('INVALID_REQUEST');
      }

      // DepartmentHead scoped access check
      if (req.user.role === 'DepartmentHead') {
        if (request.requested_to_department_id !== req.user.department_id) {
          throw new Error('FORBIDDEN');
        }
      }

      // Close current Allocation
      await tx.allocation.update({
        where: { id: request.from_allocation_id },
        data: {
          status: 'Returned',
          actual_return_date: new Date()
        }
      });

      // Create new Allocation
      const newAllocation = await tx.allocation.create({
        data: {
          asset_id: request.asset_id,
          holder_user_id: request.requested_to_user_id,
          holder_department_id: request.requested_to_department_id,
          allocated_by: req.user.id,
          condition_at_checkout: request.from_allocation.condition_at_checkout, // carry over condition
          status: 'Active'
        }
      });

      // Complete transfer request
      await tx.transferRequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'Completed',
          approved_by: req.user.id,
          resolved_at: new Date()
        }
      });

      // Note: Asset status stays 'Allocated'
      return newAllocation;
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    if (err.message === 'INVALID_REQUEST') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Transfer request not found or not pending' } });
    }
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to approve this transfer' } });
    }
    next(err);
  }
};

const rejectTransferRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await prisma.transferRequest.findUnique({ where: { id: parseInt(id) } });
    if (!request || request.status !== 'Pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Transfer request not found or not pending' } });
    }

    if (req.user.role === 'DepartmentHead' && request.requested_to_department_id !== req.user.department_id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized to reject this transfer' } });
    }

    const updated = await prisma.transferRequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'Rejected',
        approved_by: req.user.id,
        resolved_at: new Date(),
        notes: reason // Assuming notes can be used for reason, or maybe add a rejected_reason column? Wait schema has no rejected_reason for TransferRequest, only notes.
      }
    });

    res.json({ success: true, data: updated, error: null });
  } catch (err) {
    next(err);
  }
};

const returnAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { condition_at_checkin, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({ where: { id: parseInt(id) } });
      if (!allocation || allocation.status !== 'Active') {
        throw new Error('INVALID_ALLOCATION');
      }

      const updatedAlloc = await tx.allocation.update({
        where: { id: parseInt(id) },
        data: {
          status: 'Returned',
          actual_return_date: new Date(),
          condition_at_checkin
          // notes field doesn't exist in Allocation model, could be logged via activity log or just ignored.
        }
      });

      await tx.asset.update({
        where: { id: allocation.asset_id },
        data: { status: 'Available' }
      });

      return updatedAlloc;
    });

    res.json({ success: true, data: result, error: null });
  } catch (err) {
    if (err.message === 'INVALID_ALLOCATION') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ALLOCATION', message: 'Allocation not found or not active' } });
    }
    next(err);
  }
};

module.exports = {
  allocate,
  createTransferRequest,
  approveTransferRequest,
  rejectTransferRequest,
  returnAllocation
};
