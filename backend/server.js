const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import routes
const contentRoutes = require('./src/api/routes/content');
const researchRoutes = require('./src/api/routes/research');
const characterRoutes = require('./src/api/routes/character');
const socialRoutes = require('./src/api/routes/social');
const analyticsRoutes = require('./src/api/routes/analytics');
const engagementRoutes = require('./src/api/routes/engagement');

// Import middleware
const authMiddleware = require('./src/api/middleware/auth');
const errorHandler = require('./src/api/middleware/errorHandler');
const rateLimiter = require('./src/api/middleware/rateLimiter');

// Import services
const logger = require('./src/utils/logger');
const database = require('./src/database/connection');
const { startScheduledJobs } = require('./src/services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/content', contentRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/engagement', engagementRoutes);

// Protected routes (require authentication)
app.use('/api/admin', authMiddleware, require('./src/api/routes/admin'));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 LARK Labs AI Influencer Backend running on port ${PORT}`);
  console.log(`📍 Working directory: ${process.cwd()}`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}`);
  
  try {
    // Initialize database connection
    await database.connect();
    console.log('📊 Database connected successfully');
    
    // Run database migration if needed
    try {
      const migrate = require('./src/database/migrate');
      console.log('🔄 Checking database schema...');
      await migrate();
      console.log('✅ Database schema ready');
    } catch (migrationError) {
      console.log('ℹ️ Migration skipped (tables may already exist):', migrationError.message);
    }
    
    // Start scheduled jobs
    startScheduledJobs();
    console.log('⏰ Scheduled jobs started');
    
    console.log('🤖 Alex Reid AI system ready');
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
});

module.exports = app;