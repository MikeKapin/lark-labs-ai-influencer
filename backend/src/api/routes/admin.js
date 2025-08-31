const express = require('express');
const router = express.Router();

// Admin dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        message: 'Admin dashboard endpoint',
        user: req.user || null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Admin dashboard error',
      error: error.message
    });
  }
});

// System status
router.get('/system/status', async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        system: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'System status error',
      error: error.message
    });
  }
});

// Configuration management
router.get('/config', async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        message: 'Admin configuration endpoint',
        environment: process.env.NODE_ENV,
        features: {
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          elevenlabs: !!process.env.ELEVENLABS_API_KEY,
          database: !!process.env.DATABASE_URL
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Configuration error',
      error: error.message
    });
  }
});

module.exports = router;