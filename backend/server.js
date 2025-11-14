const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Static files
app.use('/uploads', express.static('uploads'));

// Import and use routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const schoolRoutes = require('./routes/schools');
const educationRoutes = require('./routes/education');
const workRoutes = require('./routes/work');
const connectionRoutes = require('./routes/connections');
const messageRoutes = require('./routes/messages');
const mentorshipRoutes = require('./routes/mentorship');
const eventRoutes = require('./routes/events');
const jobRoutes = require('./routes/jobs');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const achievementRoutes = require('./routes/achievements');
const companyRoutes = require('./routes/companies');
const groupRoutes = require('./routes/groups');
const schoolAdminRoutes = require('./routes/schoolAdmin'); // IMPORTANT
const superAdminRoutes = require('./routes/superAdmin');
const { initEventReminderCron } = require('./utils/eventReminderCron');



// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/work', workRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/school-admin', schoolAdminRoutes); // IMPORTANT - Make sure this line exists
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/groups', groupRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Alumni Portal API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

if (process.env.NODE_ENV !== 'test') {
  initEventReminderCron();
}
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});