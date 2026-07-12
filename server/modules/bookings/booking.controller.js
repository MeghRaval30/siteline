const prisma = require('../../shared/prismaClient');
const notify = require('../../shared/notify');
const logActivity = require('../../shared/logActivity');

exports.create = async (req, res) => {
  const { asset_id, start_time, end_time, purpose, on_behalf_of_department_id } = req.body;
  const user_id = req.user.id;

  try {
    const asset = await prisma.asset.findUnique({ where: { id: asset_id } });
    if (!asset || !asset.is_bookable) {
      return res.status(400).json({ error: 'Asset is not bookable' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (start >= end) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          asset_id,
          cancelled_at: null,
          end_time: {
            gt: new Date()
          },
          AND: [
            { start_time: { lt: end } },
            { end_time: { gt: start } }
          ]
        }
      });

      if (conflict) {
        throw { status: 409, code: 'BOOKING_OVERLAP', conflict };
      }

      return await tx.booking.create({
        data: {
          asset_id,
          booked_by: user_id,
          start_time: start,
          end_time: end,
          purpose,
          on_behalf_of_department_id,
          status: 'Upcoming'
        }
      });
    });

    // Don't await notifications/logs to avoid slowing response if not necessary, or await them as PRD implies async is fine
    notify({
      userId: user_id,
      type: 'booking.confirmed',
      message: `Your booking for asset ${asset.name} is confirmed.`,
      relatedEntityType: 'Booking',
      relatedEntityId: booking.id
    }).catch(console.error);

    logActivity({
      actorUserId: user_id,
      action: 'booking.confirmed',
      entityType: 'Booking',
      entityId: booking.id,
      metadata: { asset_id, start_time, end_time }
    }).catch(console.error);

    res.status(201).json({ data: booking });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ code: err.code, data: { conflicting_booking: err.conflict } });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.list = async (req, res) => {
  const { asset_id, date_from, date_to, status } = req.query;

  const where = {};
  if (asset_id) where.asset_id = parseInt(asset_id, 10);
  
  if (date_from || date_to) {
    // Basic range overlap logic for calendar view
    // A booking falls in the view range if it starts before date_to and ends after date_from
    // PRD says: show existing bookings for a selected asset over a date range
    where.AND = [];
    if (date_from) where.AND.push({ end_time: { gte: new Date(date_from) } });
    if (date_to) where.AND.push({ start_time: { lte: new Date(date_to) } });
    if (where.AND.length === 0) delete where.AND;
  }

  try {
    let bookings = await prisma.booking.findMany({
      where,
      include: { asset: true, user: { select: { id: true, name: true, email: true } } }
    });

    const now = new Date();
    
    bookings = bookings.map(b => {
      let computedStatus = 'Upcoming';
      if (b.cancelled_at) {
        computedStatus = 'Cancelled';
      } else if (b.start_time > now) {
        computedStatus = 'Upcoming';
      } else if (b.start_time <= now && b.end_time >= now) {
        computedStatus = 'Ongoing';
      } else if (b.end_time < now) {
        computedStatus = 'Completed';
      }

      return {
        ...b,
        status: computedStatus
      };
    });

    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    res.json({ data: bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.cancel = async (req, res) => {
  const bookingId = parseInt(req.params.id, 10);
  const user_id = req.user.id;

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.cancelled_at) return res.status(400).json({ error: 'Already cancelled' });

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        cancelled_by: user_id,
        cancelled_at: new Date()
      }
    });

    notify({
      userId: updated.booked_by,
      type: 'booking.cancelled',
      message: `Booking for asset ${booking.asset_id} was cancelled.`,
      relatedEntityType: 'Booking',
      relatedEntityId: booking.id
    }).catch(console.error);

    logActivity({
      actorUserId: user_id,
      action: 'booking.cancelled',
      entityType: 'Booking',
      entityId: booking.id
    }).catch(console.error);

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
