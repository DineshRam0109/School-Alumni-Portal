const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// ✅ IMPROVED CORS Configuration - Handles multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://school-alumni-portal-frontend.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Remove trailing slash if present
    const cleanOrigin = origin.replace(/\/$/, '');
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      const cleanAllowed = allowed.replace(/\/$/, '');
      return cleanOrigin === cleanAllowed;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight for 10 minutes
}));

// 2. Body parsing middleware - BEFORE routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// 4. Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// 5. Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
    
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// 6. Import routes
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
const schoolAdminRoutes = require('./routes/schoolAdmin');
const superAdminRoutes = require('./routes/superAdmin');

// 7. Register routes
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
app.use('/api/school-admin', schoolAdminRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/groups', groupRoutes);

// 8. Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Alumni Portal API is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Alumni Portal API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      schools: '/api/schools/*',
      connections: '/api/connections/*',
      messages: '/api/messages/*',
      groups: '/api/groups/*'
    },
    documentation: 'All API routes are under /api/*'
  });
});

// 9. Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 10. 404 handler - MUST be LAST
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    hint: 'All API endpoints are under /api/*'
  });
});

const PORT = process.env.PORT || 5000;

// Only start server locally (not in Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;