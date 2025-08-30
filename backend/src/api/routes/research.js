const express = require('express');
const database = require('../../database/connection');
const AnthropicClient = require('../../ai/anthropic-client');
const logger = require('../../utils/logger');

const router = express.Router();
const anthropic = new AnthropicClient();

/**
 * POST /api/research/industry-updates
 * Research latest HVAC industry news and updates
 */
router.post('/industry-updates', async (req, res) => {
  try {
    const {
      timeframe = '7 days',
      canadian_focus = true,
      include_regulations = true,
      urgency_filter = null
    } = req.body;

    logger.aiGeneration('Starting HVAC industry research', {
      timeframe,
      canadianFocus: canadian_focus,
      includeRegulations: include_regulations
    });

    // Research multiple aspects of HVAC industry
    const researchTopics = [
      'HVAC industry news Canada',
      'CSA HVAC standards updates',
      'HVAC equipment recalls safety alerts',
      'heat pump technology trends Canada',
      'HVAC regulation changes provincial'
    ];

    const researchResults = [];

    for (const topic of researchTopics) {
      try {
        const research = await anthropic.researchTopic(topic, {
          canadianFocus: canadian_focus,
          includeRegulations: include_regulations,
          timeframe: timeframe
        });

        // Store research data
        const researchEntry = await database.create('research_data', {
          search_query: topic,
          data_source: 'anthropic_claude_web_search',
          results: JSON.stringify(research),
          category: 'industry_update',
          canadian_specific: canadian_focus,
          urgency_level: research.urgency_level || 'medium',
          expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
        });

        researchResults.push({
          id: researchEntry.id,
          topic,
          ...research
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.warn(`Failed to research topic: ${topic}`, error.message);
        // Continue with other topics even if one fails
      }
    }

    // Filter by urgency if specified
    let filteredResults = researchResults;
    if (urgency_filter) {
      filteredResults = researchResults.filter(r => r.urgency_level === urgency_filter);
    }

    // Sort by urgency and relevance
    const urgencyOrder = { 'emergency': 4, 'high': 3, 'medium': 2, 'low': 1 };
    filteredResults.sort((a, b) => {
      const urgencyDiff = (urgencyOrder[b.urgency_level] || 0) - (urgencyOrder[a.urgency_level] || 0);
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Secondary sort by average relevance of findings
      const aAvgRelevance = a.findings?.reduce((sum, f) => sum + (f.relevance_score || 0), 0) / (a.findings?.length || 1);
      const bAvgRelevance = b.findings?.reduce((sum, f) => sum + (f.relevance_score || 0), 0) / (b.findings?.length || 1);
      return bAvgRelevance - aAvgRelevance;
    });

    logger.aiGeneration('HVAC industry research completed', {
      topicsResearched: researchTopics.length,
      resultsFound: researchResults.length,
      highUrgency: researchResults.filter(r => ['emergency', 'high'].includes(r.urgency_level)).length
    });

    res.json({
      success: true,
      research_results: filteredResults,
      summary: {
        topics_researched: researchTopics.length,
        total_findings: filteredResults.reduce((sum, r) => sum + (r.findings?.length || 0), 0),
        urgency_breakdown: {
          emergency: filteredResults.filter(r => r.urgency_level === 'emergency').length,
          high: filteredResults.filter(r => r.urgency_level === 'high').length,
          medium: filteredResults.filter(r => r.urgency_level === 'medium').length,
          low: filteredResults.filter(r => r.urgency_level === 'low').length
        },
        canadian_specific: filteredResults.filter(r => r.canadian_specific).length,
        recommended_immediate_content: filteredResults.filter(r => 
          r.recommended_action === 'Immediate' || r.urgency_level === 'emergency'
        ).length
      },
      researched_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('HVAC industry research failed:', error);
    res.status(500).json({
      success: false,
      error: 'Research failed',
      message: error.message
    });
  }
});

/**
 * POST /api/research/canadian-regulations
 * Research Canadian HVAC codes and regulations
 */
router.post('/canadian-regulations', async (req, res) => {
  try {
    const {
      province = 'all',
      regulation_type = 'all', // 'csa', 'provincial', 'municipal', 'safety'
      recent_changes_only = true
    } = req.body;

    const searchQueries = [];

    // Build search queries based on parameters
    if (province === 'all') {
      searchQueries.push('CSA B52 mechanical refrigeration code updates Canada');
      searchQueries.push('HVAC building code changes Canada provinces');
      searchQueries.push('Canadian HVAC safety regulation updates');
    } else {
      searchQueries.push(`${province} HVAC building code changes`);
      searchQueries.push(`${province} HVAC installation regulations updates`);
    }

    if (regulation_type === 'safety' || regulation_type === 'all') {
      searchQueries.push('HVAC safety regulation changes Canada');
      searchQueries.push('HVAC technician certification updates Canada');
    }

    const regulationResearch = [];

    for (const query of searchQueries) {
      try {
        const research = await anthropic.researchTopic(query, {
          canadianFocus: true,
          includeRegulations: true,
          timeframe: recent_changes_only ? '90 days' : '1 year'
        });

        // Store research
        const entry = await database.create('research_data', {
          search_query: query,
          data_source: 'anthropic_claude_web_search',
          results: JSON.stringify(research),
          category: 'regulations',
          canadian_specific: true,
          urgency_level: research.urgency_level || 'medium',
          expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days for regulations
        });

        regulationResearch.push({
          id: entry.id,
          query,
          ...research
        });

        await new Promise(resolve => setTimeout(resolve, 1500)); // Longer delay for regulation research

      } catch (error) {
        logger.warn(`Regulation research failed for: ${query}`, error.message);
      }
    }

    // Categorize findings
    const categorized = {
      csa_standards: [],
      provincial_codes: [],
      safety_updates: [],
      certification_changes: [],
      other: []
    };

    regulationResearch.forEach(research => {
      if (research.findings) {
        research.findings.forEach(finding => {
          const title = finding.title.toLowerCase();
          if (title.includes('csa') || title.includes('b52')) {
            categorized.csa_standards.push({ ...finding, research_id: research.id });
          } else if (title.includes('provincial') || title.includes('building code')) {
            categorized.provincial_codes.push({ ...finding, research_id: research.id });
          } else if (title.includes('safety') || title.includes('recall')) {
            categorized.safety_updates.push({ ...finding, research_id: research.id });
          } else if (title.includes('certification') || title.includes('license')) {
            categorized.certification_changes.push({ ...finding, research_id: research.id });
          } else {
            categorized.other.push({ ...finding, research_id: research.id });
          }
        });
      }
    });

    logger.aiGeneration('Canadian regulation research completed', {
      province,
      regulationType: regulation_type,
      totalFindings: Object.values(categorized).reduce((sum, arr) => sum + arr.length, 0)
    });

    res.json({
      success: true,
      regulation_research: regulationResearch,
      categorized_findings: categorized,
      summary: {
        province_scope: province,
        regulation_type: regulation_type,
        recent_changes_only: recent_changes_only,
        total_findings: Object.values(categorized).reduce((sum, arr) => sum + arr.length, 0),
        category_counts: {
          csa_standards: categorized.csa_standards.length,
          provincial_codes: categorized.provincial_codes.length,
          safety_updates: categorized.safety_updates.length,
          certification_changes: categorized.certification_changes.length,
          other: categorized.other.length
        }
      },
      researched_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Canadian regulation research failed:', error);
    res.status(500).json({
      success: false,
      error: 'Regulation research failed'
    });
  }
});

/**
 * POST /api/research/weather-impact
 * Research weather-based HVAC content suggestions
 */
router.post('/weather-impact', async (req, res) => {
  try {
    const {
      region = 'Canada',
      forecast_days = 7,
      seasonal_focus = null // 'spring', 'summer', 'fall', 'winter'
    } = req.body;

    let weatherQuery;
    
    if (seasonal_focus) {
      weatherQuery = `HVAC ${seasonal_focus} preparation ${region} weather challenges`;
    } else {
      weatherQuery = `extreme weather HVAC systems ${region} current conditions`;
    }

    const weatherResearch = await anthropic.researchTopic(weatherQuery, {
      canadianFocus: region.toLowerCase().includes('canada'),
      includeRegulations: false,
      timeframe: `${forecast_days} days`
    });

    // Generate content suggestions based on weather
    const contentSuggestions = await anthropic.generateContent(`
Based on this weather research: ${JSON.stringify(weatherResearch)}

As Alex Reid from LARK Labs, suggest 5 timely HVAC educational video topics that would help Canadian technicians prepare for or deal with these weather conditions.

For each suggestion, provide:
1. Video title
2. Target audience (students/technicians/business owners)
3. Urgency level (1-10)
4. Key points to cover
5. Safety considerations
6. LARK Labs tools that would be relevant

Format as JSON array of suggestions.
    `, {
      maxTokens: 2000,
      temperature: 0.7
    });

    // Parse content suggestions
    let suggestions = [];
    try {
      const jsonMatch = contentSuggestions.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      logger.warn('Failed to parse content suggestions, using fallback');
      suggestions = [{
        title: 'Weather-Based HVAC Preparation',
        target_audience: 'technicians',
        urgency_level: 5,
        key_points: ['Weather preparation', 'System maintenance', 'Emergency procedures'],
        safety_considerations: 'Standard HVAC safety protocols',
        lark_labs_tools: ['Weather impact calculator', 'Maintenance checklist']
      }];
    }

    // Store weather research
    const researchEntry = await database.create('research_data', {
      search_query: weatherQuery,
      data_source: 'anthropic_claude_web_search',
      results: JSON.stringify(weatherResearch),
      category: 'weather_impact',
      canadian_specific: region.toLowerCase().includes('canada'),
      urgency_level: weatherResearch.urgency_level || 'medium',
      expires_at: new Date(Date.now() + (forecast_days * 24 * 60 * 60 * 1000))
    });

    logger.aiGeneration('Weather impact research completed', {
      region,
      forecastDays: forecast_days,
      suggestionsGenerated: suggestions.length
    });

    res.json({
      success: true,
      weather_research: {
        id: researchEntry.id,
        ...weatherResearch
      },
      content_suggestions: suggestions,
      parameters: {
        region,
        forecast_days,
        seasonal_focus
      },
      researched_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Weather impact research failed:', error);
    res.status(500).json({
      success: false,
      error: 'Weather research failed'
    });
  }
});

/**
 * POST /api/research/trending-topics
 * Identify trending HVAC topics from social media and forums
 */
router.post('/trending-topics', async (req, res) => {
  try {
    const {
      platforms = ['reddit', 'facebook', 'linkedin'],
      topic_categories = ['technical', 'career', 'equipment', 'regulations'],
      time_window = '7 days'
    } = req.body;

    const trendingQueries = [
      'HVAC technician Reddit discussions trending',
      'HVAC Facebook groups popular topics',
      'LinkedIn HVAC professional discussions',
      'HVAC forum trending questions',
      'HVAC YouTube trending videos Canada'
    ];

    const trendingResearch = [];

    for (const query of trendingQueries) {
      try {
        const research = await anthropic.researchTopic(query, {
          canadianFocus: true,
          includeRegulations: false,
          timeframe: time_window
        });

        trendingResearch.push({
          platform_query: query,
          ...research
        });

        await new Promise(resolve => setTimeout(resolve, 1200));

      } catch (error) {
        logger.warn(`Trending topics research failed for: ${query}`, error.message);
      }
    }

    // Analyze and rank topics
    const topicFrequency = {};
    const topicDetails = {};

    trendingResearch.forEach(research => {
      if (research.content_angles) {
        research.content_angles.forEach(angle => {
          const normalizedTopic = angle.toLowerCase().trim();
          topicFrequency[normalizedTopic] = (topicFrequency[normalizedTopic] || 0) + 1;
          
          if (!topicDetails[normalizedTopic]) {
            topicDetails[normalizedTopic] = {
              mentions: 1,
              sources: [research.platform_query],
              urgency: research.urgency_level || 'medium',
              canadian_relevance: research.canadian_specific || false
            };
          } else {
            topicDetails[normalizedTopic].mentions++;
            if (!topicDetails[normalizedTopic].sources.includes(research.platform_query)) {
              topicDetails[normalizedTopic].sources.push(research.platform_query);
            }
          }
        });
      }
    });

    // Sort topics by frequency and create ranked list
    const rankedTopics = Object.entries(topicFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15) // Top 15 trending topics
      .map(([topic, frequency]) => ({
        topic,
        frequency,
        ...topicDetails[topic]
      }));

    // Store aggregated research
    const aggregatedEntry = await database.create('research_data', {
      search_query: 'trending_hvac_topics_analysis',
      data_source: 'anthropic_claude_social_trends',
      results: JSON.stringify({
        trending_topics: rankedTopics,
        raw_research: trendingResearch
      }),
      category: 'trending_analysis',
      canadian_specific: true,
      urgency_level: 'medium',
      expires_at: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)) // 3 days for trending data
    });

    logger.aiGeneration('Trending topics research completed', {
      platformsAnalyzed: trendingQueries.length,
      topicsIdentified: rankedTopics.length,
      topTrend: rankedTopics[0]?.topic
    });

    res.json({
      success: true,
      trending_topics: rankedTopics,
      analysis_summary: {
        time_window,
        platforms_analyzed: trendingQueries.length,
        total_topics_found: Object.keys(topicFrequency).length,
        top_5_trends: rankedTopics.slice(0, 5).map(t => ({
          topic: t.topic,
          mentions: t.frequency,
          cross_platform: t.sources.length > 1
        }))
      },
      raw_research: trendingResearch,
      research_id: aggregatedEntry.id,
      researched_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Trending topics research failed:', error);
    res.status(500).json({
      success: false,
      error: 'Trending topics research failed'
    });
  }
});

/**
 * GET /api/research/history
 * Get historical research data with filters
 */
router.get('/history', async (req, res) => {
  try {
    const {
      category = null,
      days = 30,
      urgency_level = null,
      canadian_specific = null,
      limit = 50
    } = req.query;

    let conditions = {
      created_at: `>= NOW() - INTERVAL '${parseInt(days)} days'`
    };

    if (category) conditions.category = category;
    if (urgency_level) conditions.urgency_level = urgency_level;
    if (canadian_specific !== null) conditions.canadian_specific = canadian_specific === 'true';

    const research = await database.query(`
      SELECT 
        id,
        search_query,
        data_source,
        category,
        urgency_level,
        canadian_specific,
        used_in_content,
        content_id,
        created_at,
        expires_at
      FROM research_data 
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      ${category ? 'AND category = $1' : ''}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
    `, category ? [category] : []);

    const summary = {
      total_research_entries: research.rows.length,
      categories: {},
      urgency_distribution: {},
      usage_stats: {
        used_in_content: research.rows.filter(r => r.used_in_content).length,
        unused: research.rows.filter(r => !r.used_in_content).length
      }
    };

    research.rows.forEach(entry => {
      // Count categories
      if (!summary.categories[entry.category]) {
        summary.categories[entry.category] = 0;
      }
      summary.categories[entry.category]++;

      // Count urgency levels
      if (!summary.urgency_distribution[entry.urgency_level]) {
        summary.urgency_distribution[entry.urgency_level] = 0;
      }
      summary.urgency_distribution[entry.urgency_level]++;
    });

    res.json({
      success: true,
      research_history: research.rows,
      summary,
      filters_applied: {
        category,
        days: parseInt(days),
        urgency_level,
        canadian_specific: canadian_specific === null ? null : canadian_specific === 'true',
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Failed to fetch research history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch research history'
    });
  }
});

module.exports = router;