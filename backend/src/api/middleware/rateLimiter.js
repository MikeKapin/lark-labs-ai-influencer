const rateLimit = require('express-rate-limit');
const logger = require('../../utils/logger');

/**
 * Rate Limiting Configuration
 */

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Stricter rate limiting for content generation endpoints
const contentGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 content generation requests per hour
  message: {
    success: false,
    error: 'Content generation rate limit exceeded',
    message: 'Too many content generation requests. Please try again later.'
  },
  keyGenerator: (req) => {
    // Use IP + user ID if authenticated
    return req.user ? `${req.ip}-${req.user.id}` : req.ip;
  },
  handler: (req, res) => {
    logger.warn('Content generation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    
    res.status(429).json({
      success: false,
      error: 'Content generation rate limit exceeded',
      message: 'You have exceeded the content generation limit. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Rate limiting for research endpoints
const researchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 research requests per hour
  message: {
    success: false,
    error: 'Research rate limit exceeded',
    message: 'Too many research requests. Please try again later.'
  },
  handler: (req, res) => {
    logger.warn('Research rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      method: req.method,
      url: req.url
    });
    
    res.status(429).json({
      success: false,
      error: 'Research rate limit exceeded',
      message: 'You have exceeded the research request limit. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Very strict rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit to 20 admin requests per 15 minutes
  message: {
    success: false,
    error: 'Admin rate limit exceeded',
    message: 'Too many admin requests. Please try again later.'
  },
  handler: (req, res) => {
    logger.security('Admin rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Admin rate limit exceeded',
      message: 'You have exceeded the admin request limit. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Export rate limiters for specific use
module.exports = {
  general: generalLimiter,
  contentGeneration: contentGenerationLimiter,
  research: researchLimiter,
  admin: adminLimiter
};

// Export general limiter as default
module.exports = generalLimiter;
module.exports.contentGeneration = contentGenerationLimiter;
module.exports.research = researchLimiter;
module.exports.admin = adminLimiter;