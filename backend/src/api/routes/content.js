const express = require('express');
const database = require('../../database/connection');
const AnthropicClient = require('../../ai/anthropic-client');
const AlexReidCharacter = require('../../ai/character');
const VoiceSynthesis = require('../../ai/voice-synthesis');
const logger = require('../../utils/logger');

const router = express.Router();

// Initialize AI components
const anthropic = new AnthropicClient();
const alexReid = new AlexReidCharacter();
const voiceEngine = new VoiceSynthesis();

/**
 * POST /api/content/autonomous-generate
 * Trigger autonomous content generation based on research and trends
 */
router.post('/autonomous-generate', async (req, res) => {
  try {
    const { 
      force_topic = null, 
      content_type = null, 
      canadian_focus = true,
      skip_research = false 
    } = req.body;

    logger.contentCreation('Starting autonomous content generation', {
      forceTopic: force_topic,
      contentType: content_type,
      skipResearch: skip_research
    });

    let selectedTopic;
    let researchData = null;

    if (force_topic) {
      selectedTopic = force_topic;
    } else {
      // Step 1: Research current trends and industry updates
      if (!skip_research) {
        const trendingTopics = await anthropic.researchTopic('HVAC industry trends Canada', {
          canadianFocus: canadian_focus,
          includeRegulations: true,
          timeframe: '7 days'
        });

        researchData = trendingTopics;

        // Select best topic based on research
        if (trendingTopics.content_angles && trendingTopics.content_angles.length > 0) {
          selectedTopic = trendingTopics.content_angles[0];
        } else {
          selectedTopic = trendingTopics.topic;
        }
      } else {
        // Fallback to scheduled content if no research
        const upcomingContent = await database.getUpcomingContent(7);
        const plannedContent = upcomingContent.find(content => content.status === 'planned');
        
        if (plannedContent) {
          selectedTopic = plannedContent.topic;
        } else {
          selectedTopic = 'HVAC Troubleshooting Best Practices';
        }
      }
    }

    // Step 2: Determine content type and difficulty
    const contentTypeMapping = {
      'technical': { difficulty: 3, target: 'hvac_technicians' },
      'safety': { difficulty: 2, target: 'hvac_students' },
      'customer_service': { difficulty: 2, target: 'hvac_technicians' },
      'industry_update': { difficulty: 4, target: 'hvac_technicians' },
      'wellness': { difficulty: 1, target: 'hvac_technicians' }
    };

    const finalContentType = content_type || 'technical';
    const typeConfig = contentTypeMapping[finalContentType];

    // Step 3: Generate script with Alex Reid character
    const scriptParams = {
      topic: selectedTopic,
      contentType: finalContentType,
      targetAudience: typeConfig.target,
      duration: 10,
      canadianFocus: canadian_focus,
      safetyFocus: finalContentType === 'safety' || selectedTopic.toLowerCase().includes('safety'),
      difficultyLevel: typeConfig.difficulty,
      researchContext: researchData
    };

    const generationResult = await alexReid.generateConsistentContent('script', scriptParams);

    if (!generationResult.meets_threshold) {
      logger.warn('Generated content does not meet consistency threshold', {
        score: generationResult.consistency_score,
        threshold: alexReid.consistencyThreshold
      });
    }

    // Step 4: Create database entry
    const contentEntry = await database.create('content_calendar', {
      date: new Date(),
      topic: selectedTopic,
      content_type: finalContentType,
      status: 'ready',
      script: generationResult.content.script,
      target_audience: typeConfig.target,
      canadian_specific: canadian_focus,
      safety_related: scriptParams.safetyFocus,
      difficulty_level: typeConfig.difficulty,
      ai_model_used: 'claude-sonnet-4',
      generation_prompt: JSON.stringify(scriptParams),
      research_sources: researchData ? JSON.stringify(researchData) : null,
      duration_seconds: generationResult.content.duration * 60
    });

    // Step 5: Generate voice audio (optional, can be done async)
    let audioResult = null;
    if (req.body.generate_audio) {
      try {
        audioResult = await voiceEngine.generateSpeech(
          generationResult.content.script.substring(0, 1000), // First 1000 chars for demo
          { content_id: contentEntry.id }
        );
      } catch (audioError) {
        logger.warn('Audio generation failed, continuing without audio', {
          error: audioError.message
        });
      }
    }

    // Step 6: Store research data if generated
    if (researchData) {
      await database.create('research_data', {
        search_query: selectedTopic,
        data_source: 'anthropic_claude_web_search',
        results: JSON.stringify(researchData),
        category: finalContentType,
        canadian_specific: canadian_focus,
        urgency_level: researchData.urgency_level || 'medium',
        used_in_content: true,
        content_id: contentEntry.id,
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
      });
    }

    logger.contentCreation('Autonomous content generation completed', {
      contentId: contentEntry.id,
      topic: selectedTopic,
      consistencyScore: generationResult.consistency_score,
      hasAudio: !!audioResult
    });

    res.json({
      success: true,
      content: {
        id: contentEntry.id,
        topic: selectedTopic,
        content_type: finalContentType,
        script: generationResult.content.script,
        title: generationResult.content.title,
        description: generationResult.content.description,
        consistency_score: generationResult.consistency_score,
        meets_threshold: generationResult.meets_threshold,
        audio: audioResult
      },
      research: researchData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Autonomous content generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Content generation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/content/calendar
 * Get content calendar with filters
 */
router.get('/calendar', async (req, res) => {
  try {
    const { 
      days = 30, 
      status = null, 
      content_type = null,
      canadian_specific = null 
    } = req.query;

    let conditions = {};
    
    if (status) conditions.status = status;
    if (content_type) conditions.content_type = content_type;
    if (canadian_specific !== null) conditions.canadian_specific = canadian_specific === 'true';

    const content = await database.findMany('content_calendar', conditions, {
      orderBy: 'date ASC',
      limit: parseInt(days)
    });

    // Get analytics for each content piece
    const contentWithAnalytics = await Promise.all(
      content.map(async (item) => {
        const analytics = await database.query(
          `SELECT 
            SUM(views) as total_views,
            AVG(engagement_rate) as avg_engagement,
            COUNT(DISTINCT platform) as platforms_published
          FROM content_analytics 
          WHERE content_id = $1`,
          [item.id]
        );

        return {
          ...item,
          analytics: analytics.rows[0] || {
            total_views: 0,
            avg_engagement: 0,
            platforms_published: 0
          }
        };
      })
    );

    res.json({
      success: true,
      content: contentWithAnalytics,
      total_count: contentWithAnalytics.length
    });

  } catch (error) {
    logger.error('Failed to fetch content calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content calendar'
    });
  }
});

/**
 * GET /api/content/:id
 * Get specific content item with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const content = await database.findById('content_calendar', id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Get analytics
    const analytics = await database.getContentAnalytics(id);
    
    // Get research data if available
    const research = await database.findMany('research_data', { content_id: id });

    res.json({
      success: true,
      content: {
        ...content,
        analytics,
        research: research[0] || null
      }
    });

  } catch (error) {
    logger.error('Failed to fetch content details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content details'
    });
  }
});

/**
 * PUT /api/content/:id/publish
 * Publish content to social media platforms
 */
router.put('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const { platforms = ['youtube'], auto_publish = false } = req.body;

    const content = await database.findById('content_calendar', id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    if (content.status !== 'ready') {
      return res.status(400).json({
        success: false,
        error: `Content status must be 'ready', current status: ${content.status}`
      });
    }

    // Generate social media posts
    const socialPosts = await anthropic.generateSocialPosts(content, platforms);

    // Update content status
    await database.update('content_calendar', id, {
      status: auto_publish ? 'published' : 'ready_to_publish'
    });

    // TODO: Integrate with actual social media publishing APIs
    // For now, we'll simulate the publishing process

    logger.socialMedia('Content prepared for publishing', {
      contentId: id,
      platforms,
      autoPublish: auto_publish
    });

    res.json({
      success: true,
      content_id: id,
      platforms,
      social_posts: socialPosts,
      status: auto_publish ? 'published' : 'ready_to_publish',
      published_at: auto_publish ? new Date().toISOString() : null
    });

  } catch (error) {
    logger.error('Failed to publish content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish content'
    });
  }
});

/**
 * POST /api/content/:id/regenerate
 * Regenerate content with different parameters
 */
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      maintain_topic = true,
      new_content_type = null,
      new_difficulty = null,
      focus_area = null 
    } = req.body;

    const existingContent = await database.findById('content_calendar', id);
    if (!existingContent) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Prepare regeneration parameters
    const regenParams = {
      topic: maintain_topic ? existingContent.topic : focus_area || existingContent.topic,
      contentType: new_content_type || existingContent.content_type,
      targetAudience: existingContent.target_audience,
      duration: Math.round(existingContent.duration_seconds / 60),
      canadianFocus: existingContent.canadian_specific,
      safetyFocus: existingContent.safety_related,
      difficultyLevel: new_difficulty || existingContent.difficulty_level,
      researchContext: existingContent.research_sources ? JSON.parse(existingContent.research_sources) : null
    };

    // Generate new content
    const generationResult = await alexReid.generateConsistentContent('script', regenParams);

    // Update existing record
    const updatedContent = await database.update('content_calendar', id, {
      script: generationResult.content.script,
      content_type: new_content_type || existingContent.content_type,
      difficulty_level: new_difficulty || existingContent.difficulty_level,
      status: 'ready',
      ai_model_used: 'claude-sonnet-4'
    });

    logger.contentCreation('Content regenerated successfully', {
      contentId: id,
      consistencyScore: generationResult.consistency_score,
      newContentType: new_content_type,
      newDifficulty: new_difficulty
    });

    res.json({
      success: true,
      content: {
        ...updatedContent,
        consistency_score: generationResult.consistency_score,
        meets_threshold: generationResult.meets_threshold
      },
      regenerated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Content regeneration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Content regeneration failed'
    });
  }
});

/**
 * GET /api/content/:id/analytics
 * Get detailed analytics for specific content
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = null, days = 30 } = req.query;

    let analytics;
    
    if (platform) {
      analytics = await database.query(`
        SELECT * FROM content_analytics 
        WHERE content_id = $1 AND platform = $2
        AND recorded_at >= NOW() - INTERVAL '${days} days'
        ORDER BY recorded_at DESC
      `, [id, platform]);
    } else {
      analytics = await database.getContentAnalytics(id);
    }

    // Calculate summary metrics
    const summary = analytics.reduce((acc, record) => {
      acc.total_views += record.views || 0;
      acc.total_likes += record.likes || 0;
      acc.total_shares += record.shares || 0;
      acc.total_comments += record.comments || 0;
      acc.lark_labs_clicks += record.lark_labs_clicks || 0;
      return acc;
    }, {
      total_views: 0,
      total_likes: 0,
      total_shares: 0,
      total_comments: 0,
      lark_labs_clicks: 0
    });

    res.json({
      success: true,
      content_id: id,
      summary,
      detailed_analytics: analytics,
      period_days: parseInt(days)
    });

  } catch (error) {
    logger.error('Failed to fetch content analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * DELETE /api/content/:id
 * Delete content (soft delete by setting status to 'cancelled')
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const content = await database.findById('content_calendar', id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Soft delete by updating status
    await database.update('content_calendar', id, {
      status: 'cancelled'
    });

    logger.contentCreation('Content cancelled', { contentId: id });

    res.json({
      success: true,
      message: 'Content cancelled successfully'
    });

  } catch (error) {
    logger.error('Failed to cancel content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel content'
    });
  }
});

module.exports = router;