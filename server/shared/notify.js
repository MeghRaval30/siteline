const prisma = require('./prismaClient');

async function notify({ userId, type, message, relatedEntityType, relatedEntityId }) {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        message,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId
      }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw to avoid failing primary actions
  }
}

module.exports = notify;
