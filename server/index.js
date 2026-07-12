require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// TODO: Subagents will mount their routes here
const { authRouter } = require('./modules/auth');
const { dashboardRouter } = require('./modules/dashboard');
const { departmentRouter, categoryRouter, employeeRouter } = require('./modules/organization');
const assetRouter = require('./modules/assets/asset.routes.js');
const allocationRouter = require('./modules/allocations/allocation.routes.js');
const maintenanceRouter = require('./modules/maintenance/maintenance.routes.js');
const bookingRoutes = require('./modules/bookings/booking.routes');
const auditRoutes = require('./modules/audits/audit.routes');
const reportRoutes = require('./modules/reports/report.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const activityLogRoutes = require('./modules/notifications/activityLog.routes');
const aiRoutes = require('./modules/ai/ai.routes');

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/departments', departmentRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1/assets', assetRouter);
app.use('/api/v1', allocationRouter);
app.use('/api/v1/maintenance-requests', maintenanceRouter);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/audit-cycles', auditRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/activity-logs', activityLogRoutes);
app.use('/api/v1/ai', aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`SiteLine Server running on port ${port}`);
});
