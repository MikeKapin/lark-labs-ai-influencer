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
  logger.info(`🚀 LARK Labs AI Influencer Backend running on port ${PORT}`);
  
  try {
    // Initialize database connection
    await database.connect();
    logger.info('📊 Database connected successfully');
    
    // Start scheduled jobs
    startScheduledJobs();
    logger.info('⏰ Scheduled jobs started');
    
    logger.info('🤖 Alex Reid AI system ready');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
});

module.exports = app;