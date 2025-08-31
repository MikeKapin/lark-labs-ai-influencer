console.log('🚀 Starting minimal server...');

const express = require('express');
console.log('✅ Express loaded');

const cors = require('cors');
console.log('✅ CORS loaded');

const helmet = require('helmet');
console.log('✅ Helmet loaded');

require('dotenv').config();
console.log('✅ Dotenv loaded');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`📍 Working directory: ${process.cwd()}`);
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}`);
console.log(`🤖 JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'MISSING'}`);

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// Test endpoint
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint requested');
  res.json({
    message: 'LARK Labs AI Influencer Backend - Minimal Version',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Start server
console.log('🚀 Starting server...');

app.listen(PORT, () => {
  console.log(`✅ MINIMAL SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Root: http://localhost:${PORT}/`);
});

console.log('📝 Server setup complete');