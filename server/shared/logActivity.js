const prisma = require('./prismaClient');

async function logActivity({ actorUserId, action, entityType, entityId, metadata }) {
  try {
    await prisma.activityLog.create({
      data: {
        actor_user_id: actorUserId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // We don't throw here to avoid failing the primary transaction
  }
}

module.exports = logActivity;
