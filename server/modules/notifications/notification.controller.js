const prisma = require('../../shared/prismaClient');

exports.list = async (req, res) => {
  const user_id = req.user.id;
  const { is_read, page = 1, limit = 50 } = req.query;

  const where = { user_id };
  if (is_read !== undefined) {
    where.is_read = is_read === 'true';
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  try {
    const notifications = await prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' }
    });

    const total = await prisma.notification.count({ where });

    res.json({ data: notifications, meta: { total, page: parseInt(page, 10), limit: take } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markRead = async (req, res) => {
  const notificationId = parseInt(req.params.id, 10);
  const user_id = req.user.id;

  try {
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, user_id },
      data: { is_read: true }
    });

    res.json({ data: { updated: updated.count } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markAllRead = async (req, res) => {
  const user_id = req.user.id;

  try {
    const updated = await prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true }
    });

    res.json({ data: { updated: updated.count } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
