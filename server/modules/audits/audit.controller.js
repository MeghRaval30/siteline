const prisma = require('../../shared/prismaClient');
const notify = require('../../shared/notify');
const logActivity = require('../../shared/logActivity');

exports.createCycle = async (req, res) => {
  const { name, scope_department_id, scope_location, start_date, end_date, auditor_user_ids } = req.body;
  const user_id = req.user.id;

  try {
    const cycle = await prisma.$transaction(async (tx) => {
      const newCycle = await tx.auditCycle.create({
        data: {
          name,
          scope_department_id,
          scope_location,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          status: 'Open',
          created_by: user_id,
          auditors: {
            create: auditor_user_ids.map(id => ({ auditor_user_id: id }))
          }
        }
      });

      // Find in-scope assets
      let assets = [];
      if (scope_location) {
        assets = await tx.asset.findMany({ where: { location: scope_location } });
      } else if (scope_department_id) {
        // Assume active allocation indicates it's in the department
        const allocations = await tx.allocation.findMany({
          where: { holder_department_id: scope_department_id, status: 'Active' },
          select: { asset_id: true }
        });
        const assetIds = [...new Set(allocations.map(a => a.asset_id))];
        assets = await tx.asset.findMany({ where: { id: { in: assetIds } } });
      } else {
        // No scope provided, maybe all assets?
        assets = await tx.asset.findMany();
      }

      if (assets.length > 0) {
        await tx.auditItem.createMany({
          data: assets.map(asset => ({
            audit_cycle_id: newCycle.id,
            asset_id: asset.id,
            result: 'Pending'
          }))
        });
      }

      return newCycle;
    });

    logActivity({
      actorUserId: user_id,
      action: 'audit_cycle.created',
      entityType: 'AuditCycle',
      entityId: cycle.id
    }).catch(console.error);

    res.status(201).json({ data: cycle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markItem = async (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const { result, notes } = req.body;
  const user_id = req.user.id;

  try {
    const item = await prisma.auditItem.findUnique({
      where: { id: itemId },
      include: { audit_cycle: { include: { auditors: true } } }
    });

    if (!item) return res.status(404).json({ error: 'Audit item not found' });
    if (item.audit_cycle.status === 'Closed') {
      return res.status(400).json({ error: 'Audit cycle is closed' });
    }

    const isAuditor = item.audit_cycle.auditors.some(a => a.auditor_user_id === user_id);
    if (!isAuditor) {
      return res.status(403).json({ error: 'You are not assigned as an auditor for this cycle' });
    }

    const updated = await prisma.auditItem.update({
      where: { id: itemId },
      data: {
        result,
        notes,
        verified_by: user_id,
        verified_at: new Date()
      }
    });

    logActivity({
      actorUserId: user_id,
      action: 'audit_item.marked',
      entityType: 'AuditItem',
      entityId: itemId,
      metadata: { result }
    }).catch(console.error);

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.closeCycle = async (req, res) => {
  const cycleId = parseInt(req.params.id, 10);
  const user_id = req.user.id;

  try {
    const cycle = await prisma.$transaction(async (tx) => {
      const current = await tx.auditCycle.findUnique({
        where: { id: cycleId },
        include: { audit_items: true }
      });

      if (!current) throw { status: 404, message: 'Not found' };
      if (current.status === 'Closed') throw { status: 400, message: 'Already closed' };

      const updatedCycle = await tx.auditCycle.update({
        where: { id: cycleId },
        data: {
          status: 'Closed',
          closed_by: user_id,
          closed_at: new Date()
        }
      });

      const missingItems = current.audit_items.filter(i => i.result === 'Missing');
      const damagedItems = current.audit_items.filter(i => i.result === 'Damaged');

      if (missingItems.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: missingItems.map(i => i.asset_id) } },
          data: { status: 'Lost' }
        });
      }

      return { updatedCycle, missingItems, damagedItems };
    });

    const itemsToNotify = [...cycle.missingItems, ...cycle.damagedItems];
    for (const item of itemsToNotify) {
      notify({
        userId: user_id, // Might notify Admin or AssetManager, for now notify closer
        type: 'audit.discrepancy_flagged',
        message: `Discrepancy flagged for asset ${item.asset_id}: ${item.result}`,
        relatedEntityType: 'AuditItem',
        relatedEntityId: item.id
      }).catch(console.error);
    }

    logActivity({
      actorUserId: user_id,
      action: 'audit_cycle.closed',
      entityType: 'AuditCycle',
      entityId: cycleId
    }).catch(console.error);

    res.json({ data: cycle.updatedCycle });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDiscrepancies = async (req, res) => {
  const cycleId = parseInt(req.params.id, 10);

  try {
    const discrepancies = await prisma.auditItem.findMany({
      where: {
        audit_cycle_id: cycleId,
        result: {
          not: 'Verified'
        }
      },
      include: {
        asset: true
      }
    });

    res.json({ data: discrepancies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
