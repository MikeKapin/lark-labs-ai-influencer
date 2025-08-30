const express = require('express');
const database = require('../../database/connection');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get main dashboard analytics overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Get content statistics
    const contentStats = await database.query(`
      SELECT 
        COUNT(*) as total_content,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_content,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_content,
        COUNT(CASE WHEN content_type = 'technical' THEN 1 END) as technical_content,
        COUNT(CASE WHEN content_type = 'safety' THEN 1 END) as safety_content,
        COUNT(CASE WHEN canadian_specific = true THEN 1 END) as canadian_content
      FROM content_calendar
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `);

    // Get engagement metrics
    const engagementStats = await database.query(`
      SELECT 
        SUM(views) as total_views,
        SUM(likes) as total_likes,
        SUM(shares) as total_shares,
        SUM(comments) as total_comments,
        AVG(engagement_rate) as avg_engagement_rate,
        SUM(lark_labs_clicks) as lark_labs_clicks,
        SUM(tool_downloads) as tool_downloads
      FROM content_analytics
      WHERE recorded_at >= NOW() - INTERVAL '${days} days'
    `);

    // Get platform distribution
    const platformStats = await database.query(`
      SELECT 
        platform,
        COUNT(*) as content_count,
        SUM(views) as platform_views,
        AVG(engagement_rate) as platform_engagement
      FROM content_analytics
      WHERE recorded_at >= NOW() - INTERVAL '${days} days'
      GROUP BY platform
      ORDER BY platform_views DESC
    `);

    // Get top performing content
    const topContent = await database.query(`
      SELECT 
        cc.topic,
        cc.content_type,
        cc.created_at,
        SUM(ca.views) as total_views,
        AVG(ca.engagement_rate) as avg_engagement,
        SUM(ca.lark_labs_clicks) as lark_clicks
      FROM content_calendar cc
      LEFT JOIN content_analytics ca ON cc.id = ca.content_id
      WHERE cc.created_at >= NOW() - INTERVAL '${days} days'
      AND cc.status = 'published'
      GROUP BY cc.id, cc.topic, cc.content_type, cc.created_at
      ORDER BY total_views DESC
      LIMIT 5
    `);

    // Get recent activity timeline
    const recentActivity = await database.query(`
      SELECT 
        'content_created' as activity_type,
        topic as description,
        created_at as timestamp
      FROM content_calendar
      WHERE created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'research_completed' as activity_type,
        search_query as description,
        created_at as timestamp
      FROM research_data
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    // Calculate growth metrics (compare with previous period)
    const previousPeriodStats = await database.query(`
      SELECT 
        SUM(views) as prev_views,
        SUM(lark_labs_clicks) as prev_clicks,
        COUNT(DISTINCT content_id) as prev_content_count
      FROM content_analytics
      WHERE recorded_at >= NOW() - INTERVAL '${days * 2} days'
      AND recorded_at < NOW() - INTERVAL '${days} days'
    `);

    const currentViews = parseInt(engagementStats.rows[0]?.total_views) || 0;
    const previousViews = parseInt(previousPeriodStats.rows[0]?.prev_views) || 0;
    const viewsGrowth = previousViews > 0 ? 
      ((currentViews - previousViews) / previousViews * 100).toFixed(1) : 0;

    const currentClicks = parseInt(engagementStats.rows[0]?.lark_labs_clicks) || 0;
    const previousClicks = parseInt(previousPeriodStats.rows[0]?.prev_clicks) || 0;
    const clicksGrowth = previousClicks > 0 ? 
      ((currentClicks - previousClicks) / previousClicks * 100).toFixed(1) : 0;

    res.json({
      success: true,
      period_days: days,
      content_metrics: {
        total_content: parseInt(contentStats.rows[0]?.total_content) || 0,
        published_content: parseInt(contentStats.rows[0]?.published_content) || 0,
        ready_content: parseInt(contentStats.rows[0]?.ready_content) || 0,
        technical_content: parseInt(contentStats.rows[0]?.technical_content) || 0,
        safety_content: parseInt(contentStats.rows[0]?.safety_content) || 0,
        canadian_content: parseInt(contentStats.rows[0]?.canadian_content) || 0
      },
      engagement_metrics: {
        total_views: currentViews,
        total_likes: parseInt(engagementStats.rows[0]?.total_likes) || 0,
        total_shares: parseInt(engagementStats.rows[0]?.total_shares) || 0,
        total_comments: parseInt(engagementStats.rows[0]?.total_comments) || 0,
        avg_engagement_rate: parseFloat(engagementStats.rows[0]?.avg_engagement_rate || 0).toFixed(2),
        lark_labs_clicks: currentClicks,
        tool_downloads: parseInt(engagementStats.rows[0]?.tool_downloads) || 0
      },
      growth_metrics: {
        views_growth: `${viewsGrowth}%`,
        clicks_growth: `${clicksGrowth}%`,
        period_comparison: `vs previous ${days} days`
      },
      platform_distribution: platformStats.rows.map(row => ({
        platform: row.platform,
        content_count: parseInt(row.content_count),
        views: parseInt(row.platform_views || 0),
        engagement_rate: parseFloat(row.platform_engagement || 0).toFixed(2)
      })),
      top_performing_content: topContent.rows.map(row => ({
        topic: row.topic,
        content_type: row.content_type,
        views: parseInt(row.total_views || 0),
        engagement: parseFloat(row.avg_engagement || 0).toFixed(2),
        lark_clicks: parseInt(row.lark_clicks || 0),
        created_at: row.created_at
      })),
      recent_activity: recentActivity.rows,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard analytics'
    });
  }
});

/**
 * GET /api/analytics/content-performance
 * Get detailed content performance analysis
 */
router.get('/content-performance', async (req, res) => {
  try {
    const { 
      days = 30, 
      content_type = null, 
      platform = null,
      sort_by = 'views',
      limit = 20 
    } = req.query;

    let whereConditions = [`cc.created_at >= NOW() - INTERVAL '${parseInt(days)} days'`];
    let joinConditions = ['LEFT JOIN content_analytics ca ON cc.id = ca.content_id'];

    if (content_type) {
      whereConditions.push(`cc.content_type = '${content_type}'`);
    }

    if (platform) {
      joinConditions.push(`AND ca.platform = '${platform}'`);
    }

    const performanceData = await database.query(`
      SELECT 
        cc.id,
        cc.topic,
        cc.content_type,
        cc.difficulty_level,
        cc.canadian_specific,
        cc.safety_related,
        cc.created_at,
        cc.status,
        COALESCE(SUM(ca.views), 0) as total_views,
        COALESCE(SUM(ca.likes), 0) as total_likes,
        COALESCE(SUM(ca.shares), 0) as total_shares,
        COALESCE(SUM(ca.comments), 0) as total_comments,
        COALESCE(AVG(ca.engagement_rate), 0) as avg_engagement_rate,
        COALESCE(SUM(ca.lark_labs_clicks), 0) as lark_labs_clicks,
        COALESCE(SUM(ca.tool_downloads), 0) as tool_downloads,
        COUNT(DISTINCT ca.platform) as platforms_published
      FROM content_calendar cc
      ${joinConditions.join(' ')}
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY cc.id, cc.topic, cc.content_type, cc.difficulty_level, 
               cc.canadian_specific, cc.safety_related, cc.created_at, cc.status
      ORDER BY ${sort_by === 'engagement' ? 'avg_engagement_rate' : 'total_views'} DESC
      LIMIT ${parseInt(limit)}
    `);

    // Get content type performance summary
    const contentTypeSummary = await database.query(`
      SELECT 
        cc.content_type,
        COUNT(*) as content_count,
        AVG(ca.views) as avg_views,
        AVG(ca.engagement_rate) as avg_engagement,
        SUM(ca.lark_labs_clicks) as total_clicks
      FROM content_calendar cc
      LEFT JOIN content_analytics ca ON cc.id = ca.content_id
      WHERE cc.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      AND cc.status = 'published'
      GROUP BY cc.content_type
      ORDER BY avg_views DESC
    `);

    res.json({
      success: true,
      filters: {
        days: parseInt(days),
        content_type,
        platform,
        sort_by,
        limit: parseInt(limit)
      },
      content_performance: performanceData.rows.map(row => ({
        id: row.id,
        topic: row.topic,
        content_type: row.content_type,
        difficulty_level: row.difficulty_level,
        canadian_specific: row.canadian_specific,
        safety_related: row.safety_related,
        status: row.status,
        metrics: {
          views: parseInt(row.total_views),
          likes: parseInt(row.total_likes),
          shares: parseInt(row.total_shares),
          comments: parseInt(row.total_comments),
          engagement_rate: parseFloat(row.avg_engagement_rate).toFixed(2),
          lark_labs_clicks: parseInt(row.lark_labs_clicks),
          tool_downloads: parseInt(row.tool_downloads)
        },
        platforms_published: parseInt(row.platforms_published),
        created_at: row.created_at
      })),
      content_type_summary: contentTypeSummary.rows.map(row => ({
        content_type: row.content_type,
        content_count: parseInt(row.content_count),
        avg_views: parseInt(row.avg_views || 0),
        avg_engagement: parseFloat(row.avg_engagement || 0).toFixed(2),
        total_clicks: parseInt(row.total_clicks || 0)
      })),
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Content performance analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve content performance analytics'
    });
  }
});

/**
 * GET /api/analytics/audience-insights
 * Get audience analytics and demographic insights
 */
router.get('/audience-insights', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get audience interaction patterns
    const interactionPatterns = await database.query(`
      SELECT 
        ci.platform,
        ci.user_type,
        ci.interaction_type,
        ci.sentiment,
        COUNT(*) as interaction_count,
        COUNT(CASE WHEN ci.response_sent = true THEN 1 END) as responses_sent
      FROM community_interactions ci
      WHERE ci.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY ci.platform, ci.user_type, ci.interaction_type, ci.sentiment
      ORDER BY interaction_count DESC
    `);

    // Get most discussed topics
    const discussedTopics = await database.query(`
      SELECT 
        unnest(topics_mentioned) as topic,
        COUNT(*) as mention_count,
        AVG(CASE 
          WHEN sentiment = 'positive' THEN 3
          WHEN sentiment = 'neutral' THEN 2
          WHEN sentiment = 'negative' THEN 1
        END) as avg_sentiment_score
      FROM community_interactions
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      AND array_length(topics_mentioned, 1) > 0
      GROUP BY topic
      ORDER BY mention_count DESC
      LIMIT 15
    `);

    // Get engagement trends by day of week
    const weeklyTrends = await database.query(`
      SELECT 
        EXTRACT(DOW FROM ca.recorded_at) as day_of_week,
        AVG(ca.engagement_rate) as avg_engagement,
        SUM(ca.views) as total_views,
        COUNT(*) as content_count
      FROM content_analytics ca
      WHERE ca.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY day_of_week
      ORDER BY day_of_week
    `);

    // Map day numbers to names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyTrendsFormatted = weeklyTrends.rows.map(row => ({
      day: dayNames[row.day_of_week],
      avg_engagement: parseFloat(row.avg_engagement || 0).toFixed(2),
      total_views: parseInt(row.total_views || 0),
      content_count: parseInt(row.content_count)
    }));

    // Get geographic insights (simulated - would come from platform APIs)
    const geographicInsights = [
      { country: 'Canada', percentage: 65, engagement: 8.5 },
      { country: 'United States', percentage: 25, engagement: 7.2 },
      { country: 'United Kingdom', percentage: 5, engagement: 6.8 },
      { country: 'Australia', percentage: 3, engagement: 7.0 },
      { country: 'Other', percentage: 2, engagement: 6.5 }
    ];

    // Get user engagement levels
    const engagementLevels = await database.query(`
      SELECT 
        CASE 
          WHEN ca.engagement_rate >= 10 THEN 'High Engagement'
          WHEN ca.engagement_rate >= 5 THEN 'Medium Engagement'
          ELSE 'Low Engagement'
        END as engagement_level,
        COUNT(*) as content_count,
        AVG(ca.views) as avg_views,
        AVG(ca.lark_labs_clicks) as avg_lark_clicks
      FROM content_analytics ca
      WHERE ca.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY engagement_level
      ORDER BY avg_views DESC
    `);

    res.json({
      success: true,
      period_days: parseInt(days),
      interaction_patterns: interactionPatterns.rows.map(row => ({
        platform: row.platform,
        user_type: row.user_type,
        interaction_type: row.interaction_type,
        sentiment: row.sentiment,
        count: parseInt(row.interaction_count),
        response_rate: row.interaction_count > 0 ? 
          (parseInt(row.responses_sent) / parseInt(row.interaction_count) * 100).toFixed(1) : 0
      })),
      discussed_topics: discussedTopics.rows.map(row => ({
        topic: row.topic,
        mentions: parseInt(row.mention_count),
        sentiment_score: parseFloat(row.avg_sentiment_score || 0).toFixed(1)
      })),
      weekly_trends: weeklyTrendsFormatted,
      geographic_insights: geographicInsights,
      engagement_levels: engagementLevels.rows.map(row => ({
        level: row.engagement_level,
        content_count: parseInt(row.content_count),
        avg_views: parseInt(row.avg_views || 0),
        avg_lark_clicks: parseFloat(row.avg_lark_clicks || 0).toFixed(1)
      })),
      insights: {
        most_engaged_day: weeklyTrendsFormatted.reduce((prev, current) => 
          parseFloat(current.avg_engagement) > parseFloat(prev.avg_engagement) ? current : prev
        ).day,
        top_discussion_topic: discussedTopics.rows[0]?.topic || 'No data',
        primary_audience: 'Canadian HVAC Technicians (65%)',
        avg_engagement_rate: weeklyTrendsFormatted.reduce((sum, day) => 
          sum + parseFloat(day.avg_engagement), 0
        ) / weeklyTrendsFormatted.length || 0
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Audience insights analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audience insights'
    });
  }
});

/**
 * GET /api/analytics/lark-labs-impact
 * Get LARK Labs business impact metrics
 */
router.get('/lark-labs-impact', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get LARK Labs click-through data
    const larkLabsMetrics = await database.query(`
      SELECT 
        SUM(ca.lark_labs_clicks) as total_clicks,
        SUM(ca.tool_downloads) as total_downloads,
        SUM(ca.newsletter_signups) as newsletter_signups,
        AVG(ca.click_through_rate) as avg_ctr,
        COUNT(DISTINCT ca.content_id) as content_with_clicks
      FROM content_analytics ca
      WHERE ca.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
    `);

    // Get conversion funnel
    const conversionFunnel = await database.query(`
      SELECT 
        cc.content_type,
        SUM(ca.views) as total_views,
        SUM(ca.lark_labs_clicks) as total_clicks,
        SUM(ca.tool_downloads) as total_downloads,
        (SUM(ca.lark_labs_clicks)::float / NULLIF(SUM(ca.views), 0) * 100) as click_rate,
        (SUM(ca.tool_downloads)::float / NULLIF(SUM(ca.lark_labs_clicks), 0) * 100) as conversion_rate
      FROM content_calendar cc
      LEFT JOIN content_analytics ca ON cc.id = ca.content_id
      WHERE cc.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      AND cc.status = 'published'
      GROUP BY cc.content_type
      ORDER BY total_clicks DESC
    `);

    // Get top converting content
    const topConverting = await database.query(`
      SELECT 
        cc.topic,
        cc.content_type,
        SUM(ca.views) as views,
        SUM(ca.lark_labs_clicks) as clicks,
        SUM(ca.tool_downloads) as downloads,
        (SUM(ca.tool_downloads)::float / NULLIF(SUM(ca.views), 0) * 100) as conversion_rate
      FROM content_calendar cc
      LEFT JOIN content_analytics ca ON cc.id = ca.content_id
      WHERE cc.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      AND cc.status = 'published'
      GROUP BY cc.id, cc.topic, cc.content_type
      HAVING SUM(ca.lark_labs_clicks) > 0
      ORDER BY conversion_rate DESC
      LIMIT 10
    `);

    // Calculate ROI estimates (simplified)
    const totalClicks = parseInt(larkLabsMetrics.rows[0]?.total_clicks) || 0;
    const totalDownloads = parseInt(larkLabsMetrics.rows[0]?.total_downloads) || 0;
    const estimatedValue = (totalClicks * 2) + (totalDownloads * 10); // Rough value per action

    res.json({
      success: true,
      period_days: parseInt(days),
      lark_labs_metrics: {
        total_clicks: totalClicks,
        total_downloads: totalDownloads,
        newsletter_signups: parseInt(larkLabsMetrics.rows[0]?.newsletter_signups) || 0,
        avg_click_through_rate: parseFloat(larkLabsMetrics.rows[0]?.avg_ctr || 0).toFixed(2),
        content_driving_traffic: parseInt(larkLabsMetrics.rows[0]?.content_with_clicks) || 0
      },
      conversion_funnel: conversionFunnel.rows.map(row => ({
        content_type: row.content_type,
        views: parseInt(row.total_views || 0),
        clicks: parseInt(row.total_clicks || 0),
        downloads: parseInt(row.total_downloads || 0),
        click_rate: parseFloat(row.click_rate || 0).toFixed(2),
        conversion_rate: parseFloat(row.conversion_rate || 0).toFixed(2)
      })),
      top_converting_content: topConverting.rows.map(row => ({
        topic: row.topic,
        content_type: row.content_type,
        views: parseInt(row.views || 0),
        clicks: parseInt(row.clicks || 0),
        downloads: parseInt(row.downloads || 0),
        conversion_rate: parseFloat(row.conversion_rate || 0).toFixed(2)
      })),
      roi_analysis: {
        estimated_value: estimatedValue,
        cost_per_click: estimatedValue > 0 ? (estimatedValue / totalClicks).toFixed(2) : 0,
        cost_per_download: estimatedValue > 0 ? (estimatedValue / totalDownloads).toFixed(2) : 0,
        roi_estimate: 'Positive impact on LARK Labs brand awareness and tool adoption'
      },
      recommendations: [
        totalClicks > 100 ? 'Strong click-through performance - maintain current strategy' : 'Consider optimizing calls-to-action',
        totalDownloads > 20 ? 'Good conversion to tool downloads' : 'Focus on creating more tool-focused content',
        'Continue emphasizing Canadian-specific content for targeted audience'
      ],
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('LARK Labs impact analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve LARK Labs impact analytics'
    });
  }
});

/**
 * GET /api/analytics/trends
 * Get content and engagement trends over time
 */
router.get('/trends', async (req, res) => {
  try {
    const { days = 30, granularity = 'daily' } = req.query;

    const dateFormat = granularity === 'weekly' ? 'YYYY-"W"WW' : 'YYYY-MM-DD';
    const dateInterval = granularity === 'weekly' ? '1 week' : '1 day';

    // Generate date series and get metrics for each period
    const trendsData = await database.query(`
      WITH date_series AS (
        SELECT generate_series(
          DATE_TRUNC('${granularity === 'weekly' ? 'week' : 'day'}', NOW() - INTERVAL '${parseInt(days)} days'),
          DATE_TRUNC('${granularity === 'weekly' ? 'week' : 'day'}', NOW()),
          INTERVAL '${dateInterval}'
        ) AS period_date
      )
      SELECT 
        TO_CHAR(ds.period_date, '${dateFormat}') as period,
        COALESCE(COUNT(cc.id), 0) as content_created,
        COALESCE(COUNT(CASE WHEN cc.status = 'published' THEN 1 END), 0) as content_published,
        COALESCE(SUM(ca.views), 0) as total_views,
        COALESCE(AVG(ca.engagement_rate), 0) as avg_engagement_rate,
        COALESCE(SUM(ca.lark_labs_clicks), 0) as lark_labs_clicks
      FROM date_series ds
      LEFT JOIN content_calendar cc ON DATE_TRUNC('${granularity === 'weekly' ? 'week' : 'day'}', cc.created_at) = ds.period_date
      LEFT JOIN content_analytics ca ON cc.id = ca.content_id
      GROUP BY ds.period_date
      ORDER BY ds.period_date
    `);

    // Get content type trends
    const contentTypeTrends = await database.query(`
      SELECT 
        content_type,
        DATE_TRUNC('${granularity === 'weekly' ? 'week' : 'day'}', created_at) as period,
        COUNT(*) as count
      FROM content_calendar
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY content_type, period
      ORDER BY period, count DESC
    `);

    res.json({
      success: true,
      period_days: parseInt(days),
      granularity,
      trends_data: trendsData.rows.map(row => ({
        period: row.period,
        content_created: parseInt(row.content_created),
        content_published: parseInt(row.content_published),
        total_views: parseInt(row.total_views),
        avg_engagement_rate: parseFloat(row.avg_engagement_rate).toFixed(2),
        lark_labs_clicks: parseInt(row.lark_labs_clicks)
      })),
      content_type_trends: contentTypeTrends.rows.map(row => ({
        content_type: row.content_type,
        period: row.period,
        count: parseInt(row.count)
      })),
      summary: {
        trend_direction: this.calculateTrendDirection(trendsData.rows, 'total_views'),
        peak_performance_period: this.findPeakPeriod(trendsData.rows),
        most_productive_period: this.findMostProductivePeriod(trendsData.rows)
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Trends analytics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve trends analytics'
    });
  }
});

// Helper methods for trend analysis
router.calculateTrendDirection = (data, metric) => {
  if (data.length < 2) return 'insufficient_data';
  
  const recent = data.slice(-3).reduce((sum, row) => sum + parseInt(row[metric] || 0), 0);
  const earlier = data.slice(0, 3).reduce((sum, row) => sum + parseInt(row[metric] || 0), 0);
  
  if (recent > earlier * 1.1) return 'upward';
  if (recent < earlier * 0.9) return 'downward';
  return 'stable';
};

router.findPeakPeriod = (data) => {
  if (data.length === 0) return null;
  
  return data.reduce((max, row) => 
    parseInt(row.total_views || 0) > parseInt(max.total_views || 0) ? row : max
  ).period;
};

router.findMostProductivePeriod = (data) => {
  if (data.length === 0) return null;
  
  return data.reduce((max, row) => 
    parseInt(row.content_created || 0) > parseInt(max.content_created || 0) ? row : max
  ).period;
};

module.exports = router;