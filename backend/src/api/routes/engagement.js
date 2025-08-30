const express = require('express');
const AnthropicClient = require('../../ai/anthropic-client');
const AlexReidCharacter = require('../../ai/character');
const database = require('../../database/connection');
const logger = require('../../utils/logger');

const router = express.Router();

// Initialize AI components
const anthropic = new AnthropicClient();
const alexReid = new AlexReidCharacter();

/**
 * POST /api/engagement/respond-comments
 * Auto-respond to community comments and questions
 */
router.post('/respond-comments', async (req, res) => {
  try {
    const { platform = 'all', limit = 10 } = req.body;

    // Get pending community interactions
    let whereClause = 'requires_response = true AND response_sent = false';
    if (platform !== 'all') {
      whereClause += ` AND platform = '${platform}'`;
    }

    const pendingInteractions = await database.query(`
      SELECT id, platform, interaction_type, user_handle, user_type, message, sentiment, topics_mentioned
      FROM community_interactions
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
    `);

    const responses = [];

    for (const interaction of pendingInteractions.rows) {
      try {
        // Generate response using Alex Reid character
        const responseAnalysis = await alexReid.generateConsistentContent('community_response', {
          interaction: interaction
        });

        if (responseAnalysis.meets_threshold) {
          // Store the generated response
          await database.update('community_interactions', interaction.id, {
            response_generated: responseAnalysis.content.suggested_response,
            response_type: 'automatic',
            response_sent: false // Would be set to true after actually posting
          });

          responses.push({
            interaction_id: interaction.id,
            platform: interaction.platform,
            user_handle: interaction.user_handle,
            original_message: interaction.message,
            generated_response: responseAnalysis.content.suggested_response,
            consistency_score: responseAnalysis.consistency_score,
            topics: responseAnalysis.content.topics || [],
            priority: responseAnalysis.content.priority || 'medium'
          });

          logger.characterEngine('Community response generated', {
            interactionId: interaction.id,
            platform: interaction.platform,
            consistencyScore: responseAnalysis.consistency_score
          });
        } else {
          logger.warn('Response did not meet consistency threshold', {
            interactionId: interaction.id,
            score: responseAnalysis.consistency_score
          });
        }

      } catch (error) {
        logger.error(`Failed to generate response for interaction ${interaction.id}:`, error);
      }
    }

    res.json({
      success: true,
      processed_interactions: pendingInteractions.rows.length,
      generated_responses: responses.length,
      responses: responses,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Comment response generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comment responses'
    });
  }
});

/**
 * POST /api/engagement/community-qa
 * Handle community questions and create educational responses
 */
router.post('/community-qa', async (req, res) => {
  try {
    const { question, user_info = {}, platform = 'general' } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    logger.characterEngine('Processing community Q&A', {
      questionLength: question.length,
      platform,
      userType: user_info.type
    });

    // Analyze the question and generate educational response
    const qaResponse = await alexReid.generateConsistentContent('community_response', {
      interaction: {
        platform: platform,
        interaction_type: 'question',
        user_type: user_info.type || 'unknown',
        message: question,
        sentiment: 'neutral'
      }
    });

    // Store the Q&A interaction
    const interactionRecord = await database.create('community_interactions', {
      platform: platform,
      interaction_type: 'question',
      user_handle: user_info.handle || 'anonymous',
      user_type: user_info.type || 'unknown',
      message: question,
      sentiment: 'neutral',
      topics_mentioned: qaResponse.content.topics || [],
      requires_response: false,
      response_generated: qaResponse.content.suggested_response,
      response_sent: true,
      response_type: 'automatic'
    });

    // Check if this question suggests new content opportunities
    const contentSuggestions = qaResponse.content.follow_up_content_ideas || [];

    res.json({
      success: true,
      question: question,
      response: {
        answer: qaResponse.content.suggested_response,
        consistency_score: qaResponse.consistency_score,
        educational_value: qaResponse.content.priority === 'high',
        topics_covered: qaResponse.content.topics || [],
        additional_resources: qaResponse.content.additional_resources || []
      },
      content_opportunities: contentSuggestions,
      interaction_id: interactionRecord.id,
      responded_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Community Q&A processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process community question',
      message: error.message
    });
  }
});

/**
 * GET /api/engagement/sentiment
 * Analyze community sentiment and engagement patterns
 */
router.get('/sentiment', async (req, res) => {
  try {
    const { days = 30, platform = null } = req.query;

    let whereClause = `created_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
    if (platform) {
      whereClause += ` AND platform = '${platform}'`;
    }

    // Get sentiment distribution
    const sentimentData = await database.query(`
      SELECT 
        sentiment,
        platform,
        user_type,
        COUNT(*) as interaction_count,
        COUNT(CASE WHEN response_sent = true THEN 1 END) as responded_count
      FROM community_interactions
      WHERE ${whereClause}
      GROUP BY sentiment, platform, user_type
      ORDER BY interaction_count DESC
    `);

    // Get trending topics in community discussions
    const trendingTopics = await database.query(`
      SELECT 
        unnest(topics_mentioned) as topic,
        sentiment,
        COUNT(*) as mention_count,
        AVG(CASE 
          WHEN sentiment = 'positive' THEN 3
          WHEN sentiment = 'neutral' THEN 2
          WHEN sentiment = 'negative' THEN 1
        END) as sentiment_score
      FROM community_interactions
      WHERE ${whereClause}
      AND array_length(topics_mentioned, 1) > 0
      GROUP BY topic, sentiment
      ORDER BY mention_count DESC
      LIMIT 20
    `);

    // Get engagement effectiveness metrics
    const engagementMetrics = await database.query(`
      SELECT 
        platform,
        AVG(CASE 
          WHEN sentiment = 'positive' THEN 3
          WHEN sentiment = 'neutral' THEN 2
          WHEN sentiment = 'negative' THEN 1
        END) as avg_sentiment_score,
        COUNT(*) as total_interactions,
        COUNT(CASE WHEN response_sent = true THEN 1 END) as responses_sent,
        COUNT(CASE WHEN response_type = 'automatic' THEN 1 END) as auto_responses
      FROM community_interactions
      WHERE ${whereClause}
      GROUP BY platform
      ORDER BY avg_sentiment_score DESC
    `);

    // Calculate overall sentiment trends
    const overallSentiment = await database.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        sentiment,
        COUNT(*) as count
      FROM community_interactions
      WHERE ${whereClause}
      GROUP BY date, sentiment
      ORDER BY date DESC
    `);

    // Identify areas needing attention
    const negativeInteractions = await database.query(`
      SELECT 
        platform,
        user_type,
        topics_mentioned,
        message,
        created_at
      FROM community_interactions
      WHERE ${whereClause}
      AND sentiment = 'negative'
      AND response_sent = false
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      analysis_period: parseInt(days),
      platform_filter: platform,
      sentiment_distribution: sentimentData.rows.map(row => ({
        sentiment: row.sentiment,
        platform: row.platform,
        user_type: row.user_type,
        interactions: parseInt(row.interaction_count),
        response_rate: row.interaction_count > 0 ? 
          (parseInt(row.responded_count) / parseInt(row.interaction_count) * 100).toFixed(1) : 0
      })),
      trending_topics: trendingTopics.rows.map(row => ({
        topic: row.topic,
        sentiment: row.sentiment,
        mentions: parseInt(row.mention_count),
        sentiment_score: parseFloat(row.sentiment_score).toFixed(1)
      })),
      platform_metrics: engagementMetrics.rows.map(row => ({
        platform: row.platform,
        avg_sentiment: parseFloat(row.avg_sentiment_score).toFixed(2),
        total_interactions: parseInt(row.total_interactions),
        response_rate: (parseInt(row.responses_sent) / parseInt(row.total_interactions) * 100).toFixed(1),
        automation_rate: (parseInt(row.auto_responses) / parseInt(row.responses_sent) * 100).toFixed(1)
      })),
      sentiment_trends: overallSentiment.rows.map(row => ({
        date: row.date,
        sentiment: row.sentiment,
        count: parseInt(row.count)
      })),
      attention_needed: {
        negative_interactions: negativeInteractions.rows.length,
        unresponded_negative: negativeInteractions.rows.map(row => ({
          platform: row.platform,
          user_type: row.user_type,
          topics: row.topics_mentioned || [],
          preview: row.message.substring(0, 100) + '...',
          created_at: row.created_at
        }))
      },
      insights: {
        overall_sentiment_health: this.calculateSentimentHealth(sentimentData.rows),
        most_positive_platform: this.findMostPositivePlatform(engagementMetrics.rows),
        improvement_areas: this.identifyImprovementAreas(sentimentData.rows, trendingTopics.rows)
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Sentiment analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze community sentiment'
    });
  }
});

/**
 * POST /api/engagement/bulk-respond
 * Process multiple interactions and generate responses in bulk
 */
router.post('/bulk-respond', async (req, res) => {
  try {
    const { interaction_ids, response_style = 'educational' } = req.body;

    if (!interaction_ids || !Array.isArray(interaction_ids)) {
      return res.status(400).json({
        success: false,
        error: 'interaction_ids array is required'
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      responses: []
    };

    for (const interactionId of interaction_ids) {
      try {
        results.processed++;

        // Get interaction details
        const interaction = await database.findById('community_interactions', interactionId);
        if (!interaction) {
          results.failed++;
          continue;
        }

        // Generate response based on style
        const responseParams = {
          interaction: interaction,
          response_style: response_style
        };

        const responseResult = await alexReid.generateConsistentContent('community_response', responseParams);

        if (responseResult.meets_threshold) {
          // Update interaction with generated response
          await database.update('community_interactions', interactionId, {
            response_generated: responseResult.content.suggested_response,
            response_type: 'bulk_automatic',
            requires_response: false
          });

          results.successful++;
          results.responses.push({
            interaction_id: interactionId,
            platform: interaction.platform,
            response: responseResult.content.suggested_response,
            consistency_score: responseResult.consistency_score
          });
        } else {
          results.failed++;
        }

      } catch (error) {
        logger.error(`Bulk response generation failed for interaction ${interactionId}:`, error);
        results.failed++;
      }
    }

    logger.characterEngine('Bulk response generation completed', {
      processed: results.processed,
      successful: results.successful,
      failed: results.failed
    });

    res.json({
      success: results.successful > 0,
      results: results,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Bulk response processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk responses'
    });
  }
});

/**
 * GET /api/engagement/stats
 * Get engagement statistics and health metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get overall engagement stats
    const engagementStats = await database.query(`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(CASE WHEN response_sent = true THEN 1 END) as total_responses,
        COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_interactions,
        COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_interactions,
        COUNT(CASE WHEN requires_response = true AND response_sent = false THEN 1 END) as pending_responses,
        AVG(CASE 
          WHEN sentiment = 'positive' THEN 3
          WHEN sentiment = 'neutral' THEN 2
          WHEN sentiment = 'negative' THEN 1
        END) as avg_sentiment_score
      FROM community_interactions
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
    `);

    // Get response time metrics (simulated)
    const responseTimeStats = {
      avg_response_time_hours: 4.2,
      fastest_response_minutes: 15,
      slowest_response_hours: 24,
      within_1_hour: 45,
      within_4_hours: 78,
      within_24_hours: 95
    };

    // Get top performing responses
    const topResponses = await database.query(`
      SELECT 
        platform,
        response_generated,
        sentiment,
        topics_mentioned,
        created_at
      FROM community_interactions
      WHERE response_sent = true
      AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      AND sentiment = 'positive'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const stats = engagementStats.rows[0];

    res.json({
      success: true,
      period_days: parseInt(days),
      engagement_overview: {
        total_interactions: parseInt(stats.total_interactions || 0),
        total_responses: parseInt(stats.total_responses || 0),
        response_rate: stats.total_interactions > 0 ? 
          (parseInt(stats.total_responses) / parseInt(stats.total_interactions) * 100).toFixed(1) : 0,
        pending_responses: parseInt(stats.pending_responses || 0),
        sentiment_distribution: {
          positive: parseInt(stats.positive_interactions || 0),
          negative: parseInt(stats.negative_interactions || 0),
          neutral: parseInt(stats.total_interactions || 0) - 
                  parseInt(stats.positive_interactions || 0) - 
                  parseInt(stats.negative_interactions || 0)
        },
        avg_sentiment_score: parseFloat(stats.avg_sentiment_score || 0).toFixed(2)
      },
      response_performance: responseTimeStats,
      top_responses: topResponses.rows.map(row => ({
        platform: row.platform,
        response: row.response_generated?.substring(0, 150) + '...',
        topics: row.topics_mentioned || [],
        created_at: row.created_at
      })),
      health_indicators: {
        response_health: parseInt(stats.total_responses || 0) / parseInt(stats.total_interactions || 1) > 0.8 ? 'Healthy' : 'Needs Attention',
        sentiment_health: parseFloat(stats.avg_sentiment_score || 0) > 2.2 ? 'Positive' : 'Mixed',
        pending_backlog: parseInt(stats.pending_responses || 0) < 10 ? 'Manageable' : 'High'
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Engagement stats retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve engagement statistics'
    });
  }
});

// Helper methods for sentiment analysis
router.calculateSentimentHealth = (sentimentData) => {
  const total = sentimentData.reduce((sum, row) => sum + parseInt(row.interaction_count), 0);
  const positive = sentimentData
    .filter(row => row.sentiment === 'positive')
    .reduce((sum, row) => sum + parseInt(row.interaction_count), 0);
  
  const positiveRate = total > 0 ? (positive / total * 100) : 0;
  
  if (positiveRate > 70) return 'Excellent';
  if (positiveRate > 50) return 'Good';
  if (positiveRate > 30) return 'Fair';
  return 'Needs Improvement';
};

router.findMostPositivePlatform = (platformMetrics) => {
  if (platformMetrics.length === 0) return 'None';
  
  return platformMetrics.reduce((best, current) => 
    parseFloat(current.avg_sentiment_score) > parseFloat(best.avg_sentiment_score) ? current : best
  ).platform;
};

router.identifyImprovementAreas = (sentimentData, topicData) => {
  const areas = [];
  
  // Check for platforms with high negative sentiment
  const negativePlatforms = sentimentData.filter(row => 
    row.sentiment === 'negative' && parseInt(row.interaction_count) > 5
  );
  
  if (negativePlatforms.length > 0) {
    areas.push(`Address negative sentiment on: ${negativePlatforms.map(p => p.platform).join(', ')}`);
  }
  
  // Check for topics with negative sentiment
  const negativeTopics = topicData.filter(row => 
    row.sentiment === 'negative' && parseInt(row.mention_count) > 3
  );
  
  if (negativeTopics.length > 0) {
    areas.push(`Create educational content for: ${negativeTopics.map(t => t.topic).slice(0, 3).join(', ')}`);
  }
  
  return areas.length > 0 ? areas : ['Community engagement is performing well'];
};

module.exports = router;