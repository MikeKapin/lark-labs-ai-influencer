const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const database = require('../../database/connection');
const logger = require('../../utils/logger');

// OAuth setup - Create client without redirect URI to avoid conflicts
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET
);

const router = express.Router();

/**
 * Social Media Publishing Routes
 * Handles YouTube, LinkedIn, and Facebook content publishing
 */

/**
 * GET /api/social/test-new-routes
 * Test if new routes are working
 */
router.get('/test-new-routes', (req, res) => {
  res.json({
    success: true,
    message: 'New routes are working!',
    available_endpoints: [
      'POST /api/social/generate-video-content',
      'PUT /api/social/update-video-status'
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/social/status
 * Check social media integration status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Social media routes are working',
    timestamp: new Date().toISOString(),
    available_platforms: ['youtube', 'linkedin', 'facebook'],
    oauth_status: {
      youtube: 'setup_required',
      linkedin: 'setup_required',
      facebook: 'not_implemented'
    }
  });
});

/**
 * POST /api/social/test-post
 * Test posting without OAuth - shows what would be posted
 */
router.post('/test-post', async (req, res) => {
  try {
    const { platform, content, title, description } = req.body;

    // Mock posting functionality
    const mockPost = {
      platform: platform,
      content: content || 'Test HVAC educational content from LARK Labs AI Influencer',
      title: title || 'HVAC Safety Tips from Alex Reid',
      description: description || 'Learn essential HVAC safety practices with LARK Labs',
      timestamp: new Date().toISOString(),
      status: 'MOCK_SUCCESS',
      message: `This would be posted to ${platform} when OAuth is configured`
    };

    // Store mock post in database
    await database.create('content_calendar', {
      topic: title || 'Mock HVAC Content',
      content_type: 'safety',
      status: 'ready',
      script: content || 'Mock educational content about HVAC safety and best practices.',
      target_audience: 'hvac_technicians',
      canadian_specific: true,
      safety_related: true,
      difficulty_level: 2,
      ai_model_used: 'claude-sonnet-4',
      generation_prompt: 'Mock content generation for testing',
      date: new Date().toISOString().split('T')[0]
    });

    logger.socialMedia('Mock post created', mockPost);

    res.json({
      success: true,
      message: 'Mock post created successfully',
      post: mockPost,
      note: 'This is a test post. Real posting requires OAuth configuration.'
    });

  } catch (error) {
    logger.error('Mock post creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mock post',
      message: error.message
    });
  }
});

/**
 * GET /api/social/setup-help
 * Shows exact OAuth setup instructions
 */
router.get('/setup-help', (req, res) => {
  const baseUrl = 'https://web-production-7385b.up.railway.app';
  
  res.json({
    message: "OAuth Setup Instructions",
    youtube: {
      oauth_client_redirect_uri: `${baseUrl}/api/social/youtube/callback`,
      instructions: [
        "1. Go to Google Cloud Console → APIs & Services → Credentials",
        "2. Click your OAuth 2.0 Client ID",
        "3. Add this EXACT redirect URI: " + `${baseUrl}/api/social/youtube/callback`,
        "4. Save changes"
      ],
      test_url: `${baseUrl}/api/social/youtube/auth`
    },
    linkedin: {
      oauth_redirect_uri: `${baseUrl}/api/social/linkedin/callback`,
      instructions: [
        "1. Go to LinkedIn Developer Portal → Your App → Auth tab", 
        "2. Add this EXACT redirect URI: " + `${baseUrl}/api/social/linkedin/callback`,
        "3. Save changes"
      ],
      test_url: `${baseUrl}/api/social/linkedin/auth`
    },
    current_credentials: {
      youtube: {
        client_id: process.env.YOUTUBE_CLIENT_ID ? "SET" : "MISSING",
        client_secret: process.env.YOUTUBE_CLIENT_SECRET ? "SET" : "MISSING", 
        channel_id: process.env.YOUTUBE_CHANNEL_ID || "MISSING"
      },
      linkedin: {
        client_id: process.env.LINKEDIN_CLIENT_ID || "MISSING",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ? "SET" : "MISSING"
      }
    }
  });
});

/**
 * GET /api/social/youtube/auth
 * Start YouTube OAuth flow
 */
router.get('/youtube/auth', (req, res) => {
  try {
    const baseUrl = process.env.RAILWAY_STATIC_URL || 'https://web-production-7385b.up.railway.app';
    const redirectUri = `${baseUrl}/api/social/youtube/callback`;
    
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: redirectUri
    });

    res.json({
      success: true,
      message: 'YouTube OAuth Setup Required',
      auth_url: authUrl,
      instructions: [
        "1. First, add this redirect URI to your Google Cloud Console:",
        redirectUri,
        "2. Go to Google Cloud Console → Your Project → APIs & Services → Credentials",
        "3. Select your OAuth 2.0 Client ID",
        "4. Add the redirect URI above to 'Authorized redirect URIs'",
        "5. Save changes in Google Cloud Console",
        "6. Then click the auth_url below to authorize:",
        authUrl
      ],
      redirect_uri_needed: redirectUri,
      google_console: "https://console.cloud.google.com/apis/credentials",
      oauth_client_redirect_uri: redirectUri,
      scopes_requested: scopes,
      note: "Make sure to add your email as a test user if the app is in testing mode"
    });
  } catch (error) {
    logger.error('YouTube OAuth setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate YouTube OAuth setup',
      message: error.message
    });
  }
});

/**
 * GET /api/social/youtube/callback
 * Handle YouTube OAuth callback
 */
router.get('/youtube/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.error('YouTube OAuth error:', error);
    return res.status(400).json({
      success: false,
      error: 'YouTube authorization failed',
      details: error
    });
  }

  try {
    // Set redirect URI for token exchange
    const baseUrl = process.env.RAILWAY_STATIC_URL || 'https://web-production-7385b.up.railway.app';
    const redirectUri = `${baseUrl}/api/social/youtube/callback`;
    
    logger.info('YouTube OAuth token exchange attempt - v2', {
      code: code ? 'present' : 'missing',
      redirectUri,
      clientId: process.env.YOUTUBE_CLIENT_ID ? 'present' : 'missing',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET ? 'present' : 'missing'
    });
    
    // Create a new OAuth client with the correct redirect URI for token exchange
    const tokenExchangeClient = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      redirectUri
    );
    
    const { tokens } = await tokenExchangeClient.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens securely (you might want to encrypt these)
    await database.query(
      'INSERT INTO system_config (config_key, config_value, description) VALUES ($1, $2, $3) ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()',
      ['youtube_access_token', JSON.stringify(tokens), 'YouTube OAuth access tokens']
    );

    logger.socialMedia('YouTube OAuth completed successfully', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token 
    });

    res.json({
      success: true,
      message: 'YouTube authorization completed successfully!',
      tokens: {
        access_token: tokens.access_token ? 'SET' : null,
        refresh_token: tokens.refresh_token ? 'SET' : null
      }
    });

  } catch (error) {
    logger.error('YouTube token exchange failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        data: error.config?.data
      }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to exchange authorization code for tokens',
      message: error.message,
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/social/linkedin/auth
 * Start LinkedIn OAuth flow
 */
router.get('/linkedin/auth', (req, res) => {
  const scopes = ['openid', 'profile', 'w_member_social'];
  const state = Math.random().toString(36).substring(7); // Simple state for security
  const redirectUri = 'https://web-production-7385b.up.railway.app/api/social/linkedin/callback';

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}&` +
    `scope=${encodeURIComponent(scopes.join(' '))}`;

  logger.socialMedia('LinkedIn OAuth flow started', { authUrl, state, redirectUri });
  
  // Instead of redirecting, show the auth URL and instructions
  res.json({
    success: true,
    message: 'LinkedIn OAuth Setup Required',
    auth_url: authUrl,
    instructions: [
      '1. First, add this redirect URI to your LinkedIn app:',
      redirectUri,
      '2. Go to LinkedIn Developer Portal → Your App → Auth tab',
      '3. Add the redirect URI above to "Authorized redirect URLs"', 
      '4. Save changes in LinkedIn',
      '5. Then click the auth_url below to authorize:',
      authUrl
    ],
    redirect_uri_needed: redirectUri,
    linkedin_developer_portal: 'https://www.linkedin.com/developers/apps'
  });
});

/**
 * GET /api/social/linkedin/callback
 * Handle LinkedIn OAuth callback
 */
router.get('/linkedin/callback', async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    logger.error('LinkedIn OAuth error:', error);
    return res.status(400).json({
      success: false,
      error: 'LinkedIn authorization failed',
      details: error
    });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: 'https://web-production-7385b.up.railway.app/api/social/linkedin/callback'
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // Store token securely
    await database.query(
      'INSERT INTO system_config (config_key, config_value, description) VALUES ($1, $2, $3) ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()',
      ['linkedin_access_token', JSON.stringify({ access_token }), 'LinkedIn OAuth access token']
    );

    logger.socialMedia('LinkedIn OAuth completed successfully', { hasAccessToken: !!access_token });

    res.json({
      success: true,
      message: 'LinkedIn authorization completed successfully!',
      access_token: access_token ? 'SET' : null
    });

  } catch (error) {
    logger.error('LinkedIn token exchange failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange authorization code for tokens',
      message: error.message
    });
  }
});

// YouTube API setup
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * POST /api/social/youtube/upload
 * Upload video to YouTube
 */
router.post('/youtube/upload', async (req, res) => {
  try {
    const {
      content_id,
      video_path,
      title,
      description,
      tags = [],
      category_id = '26', // How-to & Style
      privacy_status = 'public'
    } = req.body;

    // Validate required fields
    if (!content_id || !video_path || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content_id, video_path, title'
      });
    }

    logger.socialMedia('Starting YouTube upload', {
      contentId: content_id,
      title,
      videoPath: video_path
    });

    // TODO: Implement actual YouTube upload
    // For now, simulate the upload process
    const simulatedUpload = {
      video_id: `YT_${Date.now()}`,
      url: `https://youtube.com/watch?v=YT_${Date.now()}`,
      status: 'uploaded',
      privacy: privacy_status
    };

    // Update content calendar with YouTube video ID
    await database.update('content_calendar', content_id, {
      youtube_video_id: simulatedUpload.video_id,
      status: 'published'
    });

    // Store social media posting record
    await database.create('content_analytics', {
      content_id: content_id,
      platform: 'youtube',
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      recorded_at: new Date()
    });

    logger.socialMedia('YouTube upload completed', {
      contentId: content_id,
      videoId: simulatedUpload.video_id,
      url: simulatedUpload.url
    });

    res.json({
      success: true,
      platform: 'youtube',
      upload_result: simulatedUpload,
      content_id: content_id,
      uploaded_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('YouTube upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'YouTube upload failed',
      message: error.message
    });
  }
});

/**
 * POST /api/social/linkedin/post
 * Post content to LinkedIn
 */
router.post('/linkedin/post', async (req, res) => {
  try {
    const {
      content_id,
      text,
      video_url = null,
      image_url = null
    } = req.body;

    if (!content_id || !text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content_id, text'
      });
    }

    logger.socialMedia('Starting LinkedIn post', {
      contentId: content_id,
      hasVideo: !!video_url,
      hasImage: !!image_url
    });

    // TODO: Implement actual LinkedIn posting
    // For now, simulate the posting process
    const simulatedPost = {
      post_id: `LI_${Date.now()}`,
      url: `https://linkedin.com/posts/larklabs_${Date.now()}`,
      status: 'published'
    };

    // Update content calendar with LinkedIn post ID
    await database.update('content_calendar', content_id, {
      linkedin_post_id: simulatedPost.post_id
    });

    // Store analytics record
    await database.create('content_analytics', {
      content_id: content_id,
      platform: 'linkedin',
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      recorded_at: new Date()
    });

    logger.socialMedia('LinkedIn post completed', {
      contentId: content_id,
      postId: simulatedPost.post_id
    });

    res.json({
      success: true,
      platform: 'linkedin',
      post_result: simulatedPost,
      content_id: content_id,
      posted_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('LinkedIn post failed:', error);
    res.status(500).json({
      success: false,
      error: 'LinkedIn post failed',
      message: error.message
    });
  }
});

/**
 * POST /api/social/facebook/post
 * Post content to Facebook
 */
router.post('/facebook/post', async (req, res) => {
  try {
    const {
      content_id,
      text,
      video_url = null,
      image_url = null,
      link = null
    } = req.body;

    if (!content_id || !text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content_id, text'
      });
    }

    logger.socialMedia('Starting Facebook post', {
      contentId: content_id,
      hasVideo: !!video_url,
      hasImage: !!image_url,
      hasLink: !!link
    });

    // TODO: Implement actual Facebook posting
    // For now, simulate the posting process
    const simulatedPost = {
      post_id: `FB_${Date.now()}`,
      url: `https://facebook.com/larklabs/posts/${Date.now()}`,
      status: 'published'
    };

    // Update content calendar with Facebook post ID
    await database.update('content_calendar', content_id, {
      facebook_post_id: simulatedPost.post_id
    });

    // Store analytics record
    await database.create('content_analytics', {
      content_id: content_id,
      platform: 'facebook',
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      recorded_at: new Date()
    });

    logger.socialMedia('Facebook post completed', {
      contentId: content_id,
      postId: simulatedPost.post_id
    });

    res.json({
      success: true,
      platform: 'facebook',
      post_result: simulatedPost,
      content_id: content_id,
      posted_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Facebook post failed:', error);
    res.status(500).json({
      success: false,
      error: 'Facebook post failed',
      message: error.message
    });
  }
});

/**
 * POST /api/social/publish-all
 * Publish content to all configured platforms
 */
router.post('/publish-all', async (req, res) => {
  try {
    const {
      content_id,
      platforms = ['youtube', 'linkedin', 'facebook'],
      publish_settings = {}
    } = req.body;

    if (!content_id) {
      return res.status(400).json({
        success: false,
        error: 'content_id is required'
      });
    }

    // Get content details
    const content = await database.findById('content_calendar', content_id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    logger.socialMedia('Starting multi-platform publishing', {
      contentId: content_id,
      platforms: platforms,
      topic: content.topic
    });

    const publishResults = {};
    const errors = [];

    // Publish to each platform
    for (const platform of platforms) {
      try {
        let result;

        switch (platform) {
          case 'youtube':
            if (content.video_url) {
              result = await this.publishToYouTube(content, publish_settings.youtube || {});
              publishResults.youtube = result;
            } else {
              errors.push({ platform: 'youtube', error: 'No video URL available' });
            }
            break;

          case 'linkedin':
            result = await this.publishToLinkedIn(content, publish_settings.linkedin || {});
            publishResults.linkedin = result;
            break;

          case 'facebook':
            result = await this.publishToFacebook(content, publish_settings.facebook || {});
            publishResults.facebook = result;
            break;

          default:
            errors.push({ platform, error: 'Unsupported platform' });
        }

        // Small delay between platform posts
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        logger.error(`Failed to publish to ${platform}:`, error);
        errors.push({ platform, error: error.message });
      }
    }

    // Update content status
    const successfulPlatforms = Object.keys(publishResults);
    if (successfulPlatforms.length > 0) {
      await database.update('content_calendar', content_id, {
        status: 'published'
      });
    }

    logger.socialMedia('Multi-platform publishing completed', {
      contentId: content_id,
      successfulPlatforms: successfulPlatforms.length,
      errors: errors.length
    });

    res.json({
      success: successfulPlatforms.length > 0,
      content_id: content_id,
      publish_results: publishResults,
      successful_platforms: successfulPlatforms,
      errors: errors,
      published_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Multi-platform publishing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Multi-platform publishing failed',
      message: error.message
    });
  }
});

// Helper functions for platform status checks
const checkYouTubeStatus = () => {
  return {
    connected: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
    client_id: process.env.YOUTUBE_CLIENT_ID ? process.env.YOUTUBE_CLIENT_ID.substring(0, 20) + '...' : null,
    channel_id: process.env.YOUTUBE_CHANNEL_ID || null,
    configured: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_CHANNEL_ID)
  };
};

const checkLinkedInStatus = () => {
  return {
    connected: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    client_id: process.env.LINKEDIN_CLIENT_ID || null,
    configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
  };
};

const checkFacebookStatus = () => {
  return {
    connected: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    app_id: process.env.FACEBOOK_APP_ID || null,
    configured: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
  };
};

/**
 * GET /api/social/platforms/status
 * Get status of all social media platform integrations
 */
router.get('/platforms/status', async (req, res) => {
  try {
    const platformStatus = {
      youtube: checkYouTubeStatus(),
      linkedin: checkLinkedInStatus(),
      facebook: checkFacebookStatus()
    };

    const overallHealthy = Object.values(platformStatus).some(status => status.connected);

    res.json({
      success: true,
      overall_healthy: overallHealthy,
      platforms: platformStatus,
      last_checked: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Platform status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Platform status check failed',
      platforms: {
        youtube: { connected: false, error: 'Status check failed' },
        linkedin: { connected: false, error: 'Status check failed' },
        facebook: { connected: false, error: 'Status check failed' }
      }
    });
  }
});

/**
 * POST /api/social/generate-video-content
 * Generate video script and metadata for manual upload
 */
router.post('/generate-video-content', async (req, res) => {
  try {
    const { topic = 'Test Topic' } = req.body;

    // Simplified mock response to test if route works
    res.json({
      success: true,
      message: 'Video content generation endpoint is working!',
      mock: true,
      topic,
      video_content: {
        topic,
        script: `Hey HVAC family, Alex here from LARK Labs. Today we're talking about ${topic}. This is a mock response to test the endpoint.`,
        estimated_duration: 180,
        talking_points: [`Explain ${topic}`, 'Share practical tips', 'Promote LARK Labs tools']
      },
      video_metadata: {
        title: `${topic} - HVAC Expert Explains`,
        description: `Learn about ${topic} with Alex Reid from LARK Labs`,
        tags: ['HVAC', topic.toLowerCase(), 'LARK Labs'],
        category_id: '26'
      },
      manual_upload_guide: {
        steps: [
          "1. Record video using the provided script",
          "2. Upload to YouTube with generated metadata",
          "3. Update status via API when uploaded"
        ]
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Video content generation failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/social/update-video-status
 * Update video status after manual upload
 */
router.put('/update-video-status', async (req, res) => {
  try {
    const {
      content_id,
      youtube_video_id,
      youtube_url,
      upload_status = 'published',
      upload_notes = null
    } = req.body;

    if (!content_id) {
      return res.status(400).json({
        success: false,
        error: 'content_id is required'
      });
    }

    // Simplified database update using direct query
    await database.query(
      `UPDATE content_calendar 
       SET status = $1, youtube_video_id = $2, video_url = $3, updated_at = NOW()
       WHERE id = $4`,
      ['published', youtube_video_id, youtube_url, content_id]
    );

    // Create analytics entry if YouTube video ID provided
    if (youtube_video_id) {
      await database.query(
        `INSERT INTO content_analytics (content_id, platform, views, likes, shares, comments, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [content_id, 'youtube', 0, 0, 0, 0, new Date()]
      );
    }

    logger.socialMedia('Video upload status updated', {
      contentId: content_id,
      youtubeVideoId: youtube_video_id,
      status: upload_status
    });

    res.json({
      success: true,
      content_id,
      status: 'updated',
      youtube_video_id,
      youtube_url,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Video status update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Video status update failed',
      message: error.message
    });
  }
});

/**
 * GET /api/social/analytics/summary
 * Get social media analytics summary
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const analyticsData = await database.query(`
      SELECT 
        platform,
        COUNT(*) as posts_count,
        SUM(views) as total_views,
        SUM(likes) as total_likes,
        SUM(shares) as total_shares,
        SUM(comments) as total_comments,
        AVG(engagement_rate) as avg_engagement_rate,
        SUM(lark_labs_clicks) as total_lark_labs_clicks
      FROM content_analytics
      WHERE recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY platform
      ORDER BY total_views DESC
    `);

    const summary = {};
    let totalViews = 0;
    let totalEngagement = 0;
    let totalLarkLabsClicks = 0;

    analyticsData.rows.forEach(row => {
      summary[row.platform] = {
        posts_count: parseInt(row.posts_count),
        total_views: parseInt(row.total_views || 0),
        total_likes: parseInt(row.total_likes || 0),
        total_shares: parseInt(row.total_shares || 0),
        total_comments: parseInt(row.total_comments || 0),
        avg_engagement_rate: parseFloat(row.avg_engagement_rate || 0).toFixed(2),
        lark_labs_clicks: parseInt(row.total_lark_labs_clicks || 0)
      };

      totalViews += parseInt(row.total_views || 0);
      totalEngagement += parseInt(row.total_likes || 0) + parseInt(row.total_shares || 0) + parseInt(row.total_comments || 0);
      totalLarkLabsClicks += parseInt(row.total_lark_labs_clicks || 0);
    });

    res.json({
      success: true,
      period_days: parseInt(days),
      platforms: summary,
      overall: {
        total_views: totalViews,
        total_engagement: totalEngagement,
        lark_labs_clicks: totalLarkLabsClicks,
        platforms_active: Object.keys(summary).length
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Social analytics summary failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve social analytics summary'
    });
  }
});

// Helper functions for video content generation
const generateVideoScript = async (params) => {
  const { topic, content_type, target_audience, canadian_specific, safety_related, difficulty_level } = params;
  
  // Get character profile for consistent voice
  const characterProfile = await database.query(
    'SELECT * FROM character_profile WHERE active = true ORDER BY created_at DESC LIMIT 1'
  );
  
  const character = characterProfile.rows[0] || {
    catchphrases: ['Safety first, solutions second, success follows'],
    sign_off_phrases: ['Stay safe out there', 'See you next week']
  };

  // Get relevant knowledge from HVAC knowledge base
  const knowledgeQuery = await database.query(`
    SELECT content, source_url, verified 
    FROM hvac_knowledge 
    WHERE category ILIKE '%${topic}%' OR topic ILIKE '%${topic}%'
    ${canadian_specific ? "AND canadian_specific = true" : ""}
    ${safety_related ? "AND safety_related = true" : ""}
    ORDER BY verified DESC, created_at DESC
    LIMIT 5
  `);

  const knowledge = knowledgeQuery.rows;

  // Get appropriate content template
  const templateQuery = await database.query(
    `SELECT template_content, variables FROM content_templates 
     WHERE template_type = 'full_script' AND content_category = $1 AND active = true
     ORDER BY success_rate DESC LIMIT 1`,
    [content_type]
  );

  const template = templateQuery.rows[0];

  // Generate script structure
  const script = {
    intro: generateIntro(topic, character, content_type),
    main_points: generateMainPoints(topic, knowledge, difficulty_level),
    outro: generateOutro(character, topic),
    talking_points: generateTalkingPoints(topic, knowledge, safety_related),
    estimated_duration_seconds: 180, // 3 minutes average
    sources: knowledge.map(k => k.source_url).filter(Boolean)
  };

  script.full_script = `${script.intro}\n\n${script.main_points.join('\n\n')}\n\n${script.outro}`;

  return script;
};

const generateVideoMetadata = async (params) => {
  const { topic, script, content_type, canadian_specific, safety_related } = params;
  
  // Generate SEO-optimized title
  const titles = [
    `${topic} - HVAC Expert Explains ${canadian_specific ? '(Canadian Edition)' : ''}`,
    `${safety_related ? 'SAFETY ALERT: ' : ''}${topic} - What Every HVAC Tech Needs to Know`,
    `HVAC ${content_type.charAt(0).toUpperCase() + content_type.slice(1)}: ${topic}`,
    `${topic} Explained by LARK Labs HVAC Expert`
  ];

  // Generate description
  const description = generateVideoDescription(topic, script, canadian_specific);

  // Generate tags
  const baseTags = ['HVAC', 'heating', 'cooling', 'ventilation', 'LARK Labs', 'Alex Reid'];
  const topicTags = topic.toLowerCase().split(' ');
  const contentTypeTags = [content_type, `${content_type}_hvac`];
  const canadianTags = canadian_specific ? ['Canada', 'Canadian HVAC', 'CSA standards'] : [];
  const safetyTags = safety_related ? ['HVAC safety', 'safety first', 'lockout tagout'] : [];

  const allTags = [...baseTags, ...topicTags, ...contentTypeTags, ...canadianTags, ...safetyTags];
  const uniqueTags = [...new Set(allTags)].slice(0, 15); // YouTube limit

  // Generate thumbnail suggestions
  const thumbnailSuggestions = [
    `Alex Reid pointing at ${topic} diagram with bold text overlay`,
    `Close-up of HVAC equipment with "${topic}" title text`,
    `Split screen: Problem vs Solution with Alex Reid explaining`,
    `Safety-focused thumbnail with warning icons and Alex Reid`
  ];

  return {
    title: titles[0], // Use the first, most descriptive title
    description,
    tags: uniqueTags,
    thumbnail_suggestions: thumbnailSuggestions,
    category_id: '26', // Howto & Style
    upload_instructions: [
      'Set video to Public visibility',
      'Add to "HVAC Education" playlist',
      'Enable comments and community features',
      'Add end screen promoting LARK Labs website',
      'Use suggested thumbnail or create similar'
    ]
  };
};

const generateIntro = (topic, character, content_type) => {
  const catchphrase = character.catchphrases?.[0] || 'Safety first, solutions second, success follows';
  
  const intros = {
    safety: `Hey HVAC family, Alex here from LARK Labs. Today we need to talk about something serious - ${topic}. ${catchphrase}, and that's exactly what we're covering today.`,
    technical: `What's up HVAC family! Alex Reid here from LARK Labs. I got a great question about ${topic}, and I think a lot of you are dealing with this same issue. Let's troubleshoot this together.`,
    customer_service: `Hey everyone, Alex from LARK Labs here. Today we're talking about something that can make or break your customer relationships - ${topic}. This is crucial stuff for building your business.`,
    industry_update: `HVAC family, Alex here with an important industry update about ${topic}. This is something that's going to affect all of us, so let's break it down together.`
  };

  return intros[content_type] || intros.technical;
};

const generateMainPoints = (topic, knowledge, difficulty_level) => {
  const points = [
    `First, let's understand what ${topic} really means and why it matters in our daily work.`,
    `Now, here's the key thing most techs get wrong about ${topic}...`,
    `Let me show you the right way to handle ${topic} - this will save you time and callbacks.`
  ];

  // Add knowledge-based points if available
  if (knowledge && knowledge.length > 0) {
    knowledge.slice(0, 2).forEach((item, index) => {
      if (item.content) {
        points.push(`Point ${index + 4}: ${item.content.substring(0, 200)}...`);
      }
    });
  }

  // Adjust complexity based on difficulty level
  if (difficulty_level >= 4) {
    points.push(`Now for you experienced techs, here's the advanced consideration most people miss...`);
  }

  return points;
};

const generateOutro = (character, topic) => {
  const signOff = character.sign_off_phrases?.[0] || 'Stay safe out there';
  
  return `So that's the complete breakdown of ${topic}. Remember, every expert was once a beginner, so don't be afraid to ask questions. If this helped you out, hit that like button and subscribe for more HVAC education. Got a specific question about ${topic}? Drop it in the comments below. And don't forget to check out our free HVAC tools at larklabs.org - they're game-changers for efficiency and accuracy. ${signOff}, and I'll see you in the next one!`;
};

const generateTalkingPoints = (topic, knowledge, safety_related) => {
  const points = [
    `Define ${topic} clearly for beginners`,
    'Explain common mistakes and how to avoid them',
    'Share practical tips from field experience',
    'Mention relevant tools or techniques'
  ];

  if (safety_related) {
    points.unshift('EMPHASIZE SAFETY PROTOCOLS - this is critical');
    points.push('Remind viewers about proper PPE and procedures');
  }

  if (knowledge && knowledge.length > 0) {
    points.push('Reference industry standards and best practices');
  }

  points.push('Encourage questions and engagement in comments');
  points.push('Promote LARK Labs tools and resources');

  return points;
};

const generateVideoDescription = (topic, script, canadian_specific) => {
  const canadianNote = canadian_specific ? '\n\n🇨🇦 This video includes Canadian-specific information including CSA standards and climate considerations.' : '';
  
  return `In this video, Alex Reid from LARK Labs breaks down everything you need to know about ${topic}. Whether you're a seasoned HVAC technician or just starting out, this comprehensive guide will help you understand the key concepts and avoid common mistakes.

🔧 What You'll Learn:
• Understanding ${topic} fundamentals
• Common mistakes and how to avoid them  
• Professional tips from 20+ years of experience
• Safety considerations and best practices
• Tools and techniques for better results${canadianNote}

⚠️ SAFETY FIRST: Always follow proper lockout/tagout procedures and use appropriate PPE when working with HVAC systems.

📚 Free HVAC Resources: 
Visit larklabs.org for free tools, calculators, and guides that will make your job easier and more accurate.

💬 Got Questions?
Drop them in the comments below! Alex reads every comment and often creates follow-up videos based on your questions.

🔔 Stay Updated:
Subscribe and hit the notification bell for weekly HVAC education videos, safety tips, and industry updates.

---
LARK Labs is dedicated to advancing HVAC education and safety. Our mission is to help technicians work more efficiently, safely, and profitably.

#HVAC #HeatingAndCooling #LARKLabs #HVACEducation #HVACTech #HVACSafety #HVACTraining`;
};

// Helper methods (would be implemented with actual API calls)
router.checkYouTubeStatus = async () => {
  // TODO: Implement actual YouTube API status check
  return {
    connected: process.env.YOUTUBE_CLIENT_ID ? true : false,
    channel_id: process.env.YOUTUBE_CHANNEL_ID || null,
    quota_remaining: 'Unknown',
    last_upload: null
  };
};

router.checkLinkedInStatus = async () => {
  // TODO: Implement actual LinkedIn API status check
  return {
    connected: process.env.LINKEDIN_ACCESS_TOKEN ? true : false,
    page_id: process.env.LINKEDIN_PAGE_ID || null,
    permissions: ['w_member_social'],
    token_expires: null
  };
};

router.checkFacebookStatus = async () => {
  // TODO: Implement actual Facebook API status check
  return {
    connected: process.env.FACEBOOK_ACCESS_TOKEN ? true : false,
    page_id: process.env.FACEBOOK_PAGE_ID || null,
    permissions: ['pages_manage_posts', 'pages_read_engagement'],
    token_expires: null
  };
};

router.publishToYouTube = async (content, settings) => {
  // TODO: Implement actual YouTube publishing
  return {
    video_id: `YT_${Date.now()}`,
    url: `https://youtube.com/watch?v=YT_${Date.now()}`,
    status: 'uploaded'
  };
};

router.publishToLinkedIn = async (content, settings) => {
  // TODO: Implement actual LinkedIn publishing
  return {
    post_id: `LI_${Date.now()}`,
    url: `https://linkedin.com/posts/larklabs_${Date.now()}`,
    status: 'published'
  };
};

router.publishToFacebook = async (content, settings) => {
  // TODO: Implement actual Facebook publishing
  return {
    post_id: `FB_${Date.now()}`,
    url: `https://facebook.com/larklabs/posts/${Date.now()}`,
    status: 'published'
  };
};

module.exports = router;