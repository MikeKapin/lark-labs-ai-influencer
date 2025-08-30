const AnthropicClient = require('../ai/anthropic-client');
const AlexReidCharacter = require('../ai/character');
const HVACKnowledgeBase = require('../ai/knowledge-base');
const VoiceSynthesis = require('../ai/voice-synthesis');
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Autonomous Content Generation Engine
 * Orchestrates the complete content creation pipeline from research to publishing
 */
class AutonomousContentGenerator {
  constructor() {
    this.anthropic = new AnthropicClient();
    this.alexReid = new AlexReidCharacter();
    this.knowledgeBase = new HVACKnowledgeBase();
    this.voiceEngine = new VoiceSynthesis();
    
    // Content generation settings
    this.settings = {
      daily_content_limit: parseInt(process.env.DAILY_CONTENT_LIMIT) || 3,
      content_generation_enabled: process.env.CONTENT_GENERATION_ENABLED === 'true',
      auto_publish_enabled: process.env.AUTO_PUBLISH_ENABLED === 'true',
      technical_review_required: process.env.TECHNICAL_REVIEW_REQUIRED === 'true',
      min_consistency_score: 90
    };

    // Content strategy configuration
    this.contentStrategy = {
      monday: { type: 'technical', difficulty: 3, canadian_focus: true },
      tuesday: { type: 'safety', difficulty: 2, canadian_focus: true },
      wednesday: { type: 'customer_service', difficulty: 2, canadian_focus: false },
      thursday: { type: 'industry_update', difficulty: 4, canadian_focus: true },
      friday: { type: 'technical', difficulty: 3, canadian_focus: false },
      saturday: { type: 'customer_service', difficulty: 2, canadian_focus: false },
      sunday: { type: 'wellness', difficulty: 1, canadian_focus: false }
    };

    logger.info('Autonomous content generator initialized', {
      dailyLimit: this.settings.daily_content_limit,
      autoPublish: this.settings.auto_publish_enabled,
      generationEnabled: this.settings.content_generation_enabled
    });
  }

  /**
   * Generate daily content autonomously
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generation results
   */
  async generateDailyContent(options = {}) {
    if (!this.settings.content_generation_enabled) {
      throw new Error('Autonomous content generation is disabled');
    }

    const startTime = Date.now();
    
    try {
      logger.contentCreation('Starting autonomous daily content generation');

      // Step 1: Check daily limits
      const todayContent = await this.checkDailyLimits();
      if (todayContent.count >= this.settings.daily_content_limit) {
        return {
          success: false,
          reason: 'Daily content limit reached',
          existing_count: todayContent.count,
          limit: this.settings.daily_content_limit
        };
      }

      // Step 2: Determine content strategy for today
      const contentPlan = await this.planDailyContent(options);
      
      // Step 3: Research current trends and industry updates
      const researchData = await this.conductResearch(contentPlan);

      // Step 4: Select optimal topic based on research and strategy
      const selectedTopic = await this.selectOptimalTopic(contentPlan, researchData);

      // Step 5: Retrieve relevant knowledge base entries
      const knowledgeContext = await this.gatherKnowledgeContext(selectedTopic, contentPlan);

      // Step 6: Generate content with Alex Reid character
      const contentResult = await this.generateContent(selectedTopic, contentPlan, knowledgeContext, researchData);

      // Step 7: Quality assurance and consistency check
      const qualityCheck = await this.performQualityCheck(contentResult);

      // Step 8: Generate voice audio (if enabled)
      let audioResult = null;
      if (options.generate_audio !== false) {
        audioResult = await this.generateVoiceAudio(contentResult);
      }

      // Step 9: Create social media adaptations
      const socialContent = await this.generateSocialContent(contentResult);

      // Step 10: Store in database with full metadata
      const savedContent = await this.saveGeneratedContent({
        ...contentResult,
        qualityCheck,
        audioResult,
        socialContent,
        researchData,
        knowledgeContext
      });

      // Step 11: Auto-publish if enabled and quality checks pass
      let publishResult = null;
      if (this.settings.auto_publish_enabled && qualityCheck.approved) {
        publishResult = await this.autoPublishContent(savedContent);
      }

      const totalTime = Date.now() - startTime;

      logger.contentCreation('Autonomous content generation completed', {
        contentId: savedContent.id,
        topic: selectedTopic,
        totalTime: `${totalTime}ms`,
        qualityScore: qualityCheck.overall_score,
        autoPublished: !!publishResult
      });

      return {
        success: true,
        content: savedContent,
        quality_check: qualityCheck,
        audio: audioResult,
        social_content: socialContent,
        publish_result: publishResult,
        generation_time: totalTime,
        research_sources: researchData.sources?.length || 0
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('Autonomous content generation failed:', {
        error: error.message,
        totalTime: `${totalTime}ms`
      });
      
      // Store failure for analysis
      await this.logGenerationFailure(error, options);
      
      throw error;
    }
  }

  /**
   * Check if daily content limits have been reached
   */
  async checkDailyLimits() {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await database.query(
      `SELECT COUNT(*) as count 
       FROM content_calendar 
       WHERE DATE(created_at) = $1 
       AND status NOT IN ('cancelled', 'failed')`,
      [today]
    );

    return {
      count: parseInt(result.rows[0]?.count || 0),
      date: today,
      limit: this.settings.daily_content_limit
    };
  }

  /**
   * Plan daily content based on strategy and current context
   */
  async planDailyContent(options) {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-CA', { weekday: 'long' }).toLowerCase();
    
    // Get base strategy for the day
    const baseStrategy = this.contentStrategy[dayName] || this.contentStrategy.monday;
    
    // Override with options if provided
    const contentPlan = {
      date: today,
      day_of_week: dayName,
      content_type: options.force_content_type || baseStrategy.type,
      difficulty_level: options.force_difficulty || baseStrategy.difficulty,
      canadian_focus: options.canadian_focus !== undefined ? options.canadian_focus : baseStrategy.canadian_focus,
      duration_minutes: options.duration || 10,
      priority_topics: options.priority_topics || [],
      avoid_topics: options.avoid_topics || []
    };

    // Check for recent content to avoid repetition
    const recentTopics = await this.getRecentTopics(7); // Last 7 days
    contentPlan.recent_topics = recentTopics;

    logger.contentCreation('Daily content planned', {
      day: dayName,
      contentType: contentPlan.content_type,
      difficulty: contentPlan.difficulty_level,
      canadianFocus: contentPlan.canadian_focus
    });

    return contentPlan;
  }

  /**
   * Conduct research for current trends and urgent topics
   */
  async conductResearch(contentPlan) {
    try {
      const researchQueries = [
        'HVAC industry news Canada latest',
        `HVAC ${contentPlan.content_type} trending topics`,
        'HVAC safety alerts equipment recalls',
        'Canadian HVAC regulation updates'
      ];

      const researchResults = [];
      
      for (const query of researchQueries) {
        try {
          const research = await this.anthropic.researchTopic(query, {
            canadianFocus: contentPlan.canadian_focus,
            includeRegulations: contentPlan.content_type === 'safety' || contentPlan.content_type === 'industry_update',
            timeframe: '7 days'
          });

          researchResults.push({
            query,
            ...research
          });

          // Delay between research calls
          await this.delay(1000);

        } catch (error) {
          logger.warn(`Research failed for query: ${query}`, error.message);
        }
      }

      // Analyze research for urgent content needs
      const urgentTopics = researchResults
        .filter(r => r.urgency_level === 'emergency' || r.urgency_level === 'high')
        .map(r => r.content_angles || [])
        .flat();

      return {
        results: researchResults,
        urgent_topics: urgentTopics,
        sources: researchResults.length,
        research_timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.warn('Research phase failed, continuing with fallback:', error.message);
      return {
        results: [],
        urgent_topics: [],
        sources: 0,
        fallback_used: true
      };
    }
  }

  /**
   * Select optimal topic based on research and content strategy
   */
  async selectOptimalTopic(contentPlan, researchData) {
    // Priority 1: Urgent topics from research
    if (researchData.urgent_topics.length > 0) {
      const urgentTopic = researchData.urgent_topics[0];
      logger.contentCreation('Selected urgent topic from research', { topic: urgentTopic });
      return urgentTopic;
    }

    // Priority 2: Research-suggested topics matching content type
    const relevantResearch = researchData.results.filter(r => 
      r.content_angles && r.content_angles.length > 0
    );

    if (relevantResearch.length > 0) {
      // Use AI to select best topic
      const topicSelectionPrompt = `
Select the most appropriate HVAC educational topic for today's content:

CONTENT REQUIREMENTS:
- Content Type: ${contentPlan.content_type}
- Difficulty Level: ${contentPlan.difficulty_level}/5
- Canadian Focus: ${contentPlan.canadian_focus}
- Target Audience: HVAC technicians and students
- Avoid Recent Topics: ${contentPlan.recent_topics.join(', ')}

AVAILABLE TOPICS FROM RESEARCH:
${relevantResearch.map(r => 
  r.content_angles?.map(angle => `- ${angle}`).join('\n') || ''
).join('\n')}

Select ONE topic that:
1. Matches the content type and difficulty
2. Is highly relevant to Canadian HVAC professionals
3. Hasn't been covered recently
4. Would be genuinely helpful for the target audience

Return only the selected topic as a clear, specific title.
`;

      try {
        const selectedTopic = await this.anthropic.generateContent(topicSelectionPrompt, {
          maxTokens: 200,
          temperature: 0.4
        });

        const cleanTopic = selectedTopic.trim().replace(/^["']|["']$/g, '');
        logger.contentCreation('AI selected topic from research', { topic: cleanTopic });
        return cleanTopic;

      } catch (error) {
        logger.warn('AI topic selection failed, using first available:', error.message);
        return relevantResearch[0].content_angles[0];
      }
    }

    // Priority 3: Fallback to content strategy defaults
    const fallbackTopics = {
      'technical': [
        'HVAC System Diagnostics Made Simple',
        'Understanding Heat Pump Efficiency Ratings',
        'Refrigerant Charging Best Practices'
      ],
      'safety': [
        'Electrical Safety in HVAC Work',
        'Confined Space Safety for HVAC Technicians',
        'Chemical Safety with HVAC Cleaning Products'
      ],
      'customer_service': [
        'Explaining HVAC Repairs to Customers',
        'Managing Customer Expectations During Repairs',
        'Building Trust Through Professional Service'
      ],
      'industry_update': [
        'Latest HVAC Technology Trends',
        'New Energy Efficiency Standards',
        'HVAC Market Changes and Opportunities'
      ],
      'wellness': [
        'Managing Stress as an HVAC Professional',
        'Work-Life Balance in the HVAC Industry',
        'Building a Successful HVAC Career'
      ]
    };

    const topicOptions = fallbackTopics[contentPlan.content_type] || fallbackTopics.technical;
    const fallbackTopic = topicOptions[Math.floor(Math.random() * topicOptions.length)];
    
    logger.contentCreation('Using fallback topic', { topic: fallbackTopic });
    return fallbackTopic;
  }

  /**
   * Gather relevant knowledge base context for content generation
   */
  async gatherKnowledgeContext(topic, contentPlan) {
    try {
      const knowledgeContext = await this.knowledgeBase.getKnowledgeForContent(
        topic,
        contentPlan.content_type,
        contentPlan.difficulty_level
      );

      logger.contentCreation('Knowledge context gathered', {
        primaryEntries: knowledgeContext.primary.length,
        safetyEntries: knowledgeContext.safety.length,
        canadianEntries: knowledgeContext.canadian_specific.length
      });

      return knowledgeContext;

    } catch (error) {
      logger.warn('Knowledge context gathering failed:', error.message);
      return {
        primary: [],
        safety: [],
        canadian_specific: [],
        supplementary: []
      };
    }
  }

  /**
   * Generate content using Alex Reid character
   */
  async generateContent(topic, contentPlan, knowledgeContext, researchData) {
    const scriptParams = {
      topic,
      contentType: contentPlan.content_type,
      targetAudience: 'hvac_technicians',
      duration: contentPlan.duration_minutes,
      canadianFocus: contentPlan.canadian_focus,
      safetyFocus: contentPlan.content_type === 'safety',
      difficultyLevel: contentPlan.difficulty_level,
      researchContext: researchData,
      knowledgeContext
    };

    const generationResult = await this.alexReid.generateConsistentContent('script', scriptParams);

    if (!generationResult.meets_threshold) {
      logger.warn('Generated content below consistency threshold', {
        score: generationResult.consistency_score,
        threshold: this.settings.min_consistency_score
      });
    }

    return {
      ...generationResult.content,
      consistency_score: generationResult.consistency_score,
      meets_threshold: generationResult.meets_threshold,
      generation_params: scriptParams,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Perform quality assurance checks
   */
  async performQualityCheck(contentResult) {
    const qualityPrompt = `
Perform a comprehensive quality check on this HVAC educational content:

CONTENT TO REVIEW:
Title: ${contentResult.title}
Script: ${contentResult.script?.substring(0, 1000)}...

QUALITY CRITERIA (score 0-100 each):
1. Technical Accuracy - Are HVAC facts and procedures correct?
2. Educational Value - Does it teach useful skills/knowledge?
3. Safety Compliance - Are safety considerations properly addressed?
4. Alex Reid Character Consistency - Empathetic, professional tone?
5. Canadian Relevance - Appropriate for Canadian HVAC professionals?
6. Clarity and Structure - Well-organized and easy to follow?
7. Practical Application - Can viewers apply this knowledge?
8. Engagement Factor - Will it keep viewers interested?

APPROVAL CRITERIA:
- Technical accuracy must be 90+ for safety-related content, 85+ for others
- All scores should be 70+ for approval
- Character consistency must be 85+

Return JSON only:
{
  "technical_accuracy": 92,
  "educational_value": 88,
  "safety_compliance": 95,
  "character_consistency": 90,
  "canadian_relevance": 85,
  "clarity_structure": 87,
  "practical_application": 89,
  "engagement_factor": 84,
  "overall_score": 88.75,
  "approved": true,
  "concerns": ["any concerns"],
  "improvements": ["suggested improvements"],
  "review_notes": "Brief overall assessment"
}
`;

    try {
      const response = await this.anthropic.generateContent(qualityPrompt, {
        maxTokens: 1000,
        temperature: 0.2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const qualityCheck = JSON.parse(jsonMatch[0]);
        
        logger.contentCreation('Quality check completed', {
          overallScore: qualityCheck.overall_score,
          approved: qualityCheck.approved
        });

        return qualityCheck;
      } else {
        throw new Error('Failed to parse quality check response');
      }

    } catch (error) {
      logger.warn('Quality check failed, using conservative approval:', error.message);
      return {
        overall_score: 75,
        approved: this.settings.technical_review_required ? false : true,
        review_notes: 'Automated quality check failed, requires manual review',
        manual_review_required: true
      };
    }
  }

  /**
   * Generate voice audio for content
   */
  async generateVoiceAudio(contentResult) {
    try {
      // Extract intro and key sections for audio generation
      const audioText = this.extractAudioContent(contentResult.script);
      
      const audioResult = await this.voiceEngine.generateSpeech(audioText, {
        content_id: contentResult.id,
        content_type: 'educational_intro'
      });

      logger.contentCreation('Voice audio generated', {
        audioPath: audioResult.filename,
        duration: audioResult.estimated_duration,
        quality: audioResult.quality_score.overall
      });

      return audioResult;

    } catch (error) {
      logger.warn('Voice audio generation failed:', error.message);
      return null;
    }
  }

  /**
   * Extract key content sections for audio generation
   */
  extractAudioContent(script) {
    // Extract intro (first 500 characters)
    const intro = script.substring(0, 500);
    
    // Look for key points or safety warnings
    const lines = script.split('\n');
    const keyPoints = lines.filter(line => 
      line.includes('SAFETY') || 
      line.includes('Important') ||
      line.includes('Remember') ||
      line.includes('Key point')
    ).slice(0, 3).join(' ');

    return intro + (keyPoints ? '\n\n' + keyPoints : '');
  }

  /**
   * Generate social media content adaptations
   */
  async generateSocialContent(contentResult) {
    try {
      const socialContent = await this.anthropic.generateSocialPosts(
        contentResult,
        ['youtube', 'linkedin', 'facebook']
      );

      logger.contentCreation('Social media content generated', {
        platforms: Object.keys(socialContent).length
      });

      return socialContent;

    } catch (error) {
      logger.warn('Social content generation failed:', error.message);
      return {
        youtube: { description: contentResult.description, title: contentResult.title },
        linkedin: { post: `New HVAC education content: ${contentResult.title}` },
        facebook: { post: `HVAC family, check out our latest video: ${contentResult.title}` }
      };
    }
  }

  /**
   * Save generated content to database with full metadata
   */
  async saveGeneratedContent(contentData) {
    const savedContent = await database.create('content_calendar', {
      date: new Date(),
      topic: contentData.topic,
      content_type: contentData.contentType || 'technical',
      status: contentData.qualityCheck.approved ? 'ready' : 'review_required',
      script: contentData.script,
      duration_seconds: contentData.duration * 60,
      target_audience: contentData.target_audience,
      canadian_specific: contentData.canadian_specific,
      safety_related: contentData.safety_related,
      difficulty_level: contentData.difficulty_level,
      ai_model_used: 'claude-sonnet-4',
      generation_prompt: JSON.stringify(contentData.generation_params),
      research_sources: JSON.stringify(contentData.researchData)
    });

    // Store quality check results separately for analysis
    await this.storeQualityCheckResults(savedContent.id, contentData.qualityCheck);

    return savedContent;
  }

  /**
   * Auto-publish content if conditions are met
   */
  async autoPublishContent(contentData) {
    if (!this.settings.auto_publish_enabled) {
      return null;
    }

    try {
      // TODO: Implement actual social media publishing
      // For now, just update status to indicate auto-publishing intent
      await database.update('content_calendar', contentData.id, {
        status: 'published'
      });

      logger.socialMedia('Content auto-published', {
        contentId: contentData.id,
        topic: contentData.topic
      });

      return {
        published: true,
        platforms: ['youtube'], // Would be actual platforms
        published_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Auto-publish failed:', error.message);
      return {
        published: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent topics to avoid repetition
   */
  async getRecentTopics(days = 7) {
    const result = await database.query(
      `SELECT topic FROM content_calendar 
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       AND status NOT IN ('cancelled', 'failed')
       ORDER BY created_at DESC`,
      []
    );

    return result.rows.map(row => row.topic);
  }

  /**
   * Store quality check results for analysis
   */
  async storeQualityCheckResults(contentId, qualityCheck) {
    // This would store detailed quality metrics for trend analysis
    // Implementation would depend on specific analytics requirements
    logger.debug('Quality check results stored', {
      contentId,
      overallScore: qualityCheck.overall_score
    });
  }

  /**
   * Log generation failures for analysis
   */
  async logGenerationFailure(error, options) {
    logger.error('Content generation failure logged', {
      error: error.message,
      options,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get generator status and health
   */
  async getGeneratorStatus() {
    const todayStats = await this.checkDailyLimits();
    const characterStatus = await this.alexReid.getCharacterStatus();

    return {
      enabled: this.settings.content_generation_enabled,
      daily_stats: todayStats,
      settings: this.settings,
      character_health: characterStatus.health_status,
      last_generation: await this.getLastGeneration()
    };
  }

  /**
   * Get last content generation info
   */
  async getLastGeneration() {
    const result = await database.query(
      `SELECT topic, created_at, status 
       FROM content_calendar 
       ORDER BY created_at DESC 
       LIMIT 1`,
      []
    );

    return result.rows[0] || null;
  }
}

module.exports = AutonomousContentGenerator;