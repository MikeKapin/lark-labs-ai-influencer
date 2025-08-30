const cron = require('node-cron');
const AutonomousContentGenerator = require('../content/generator');
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Scheduling Service for Autonomous Content Generation
 * Manages automated content creation, publishing, and maintenance tasks
 */
class SchedulingService {
  constructor() {
    this.contentGenerator = new AutonomousContentGenerator();
    this.jobs = new Map();
    this.isRunning = false;

    // Scheduling configuration
    this.schedules = {
      // Daily content generation at 6 AM EST
      daily_content: {
        cron: '0 6 * * *',
        timezone: 'America/Toronto',
        enabled: process.env.SCHEDULED_GENERATION_ENABLED !== 'false'
      },
      
      // Industry research every 4 hours
      research_updates: {
        cron: '0 */4 * * *',
        timezone: 'America/Toronto', 
        enabled: true
      },

      // Weekly knowledge base maintenance
      knowledge_maintenance: {
        cron: '0 3 * * 0', // Sundays at 3 AM
        timezone: 'America/Toronto',
        enabled: true
      },

      // Daily analytics collection at 11 PM
      analytics_collection: {
        cron: '0 23 * * *',
        timezone: 'America/Toronto',
        enabled: true
      },

      // Clean up old files weekly
      file_cleanup: {
        cron: '0 2 * * 0', // Sundays at 2 AM
        timezone: 'America/Toronto',
        enabled: true
      },

      // Health checks every 30 minutes
      health_check: {
        cron: '*/30 * * * *',
        timezone: 'America/Toronto',
        enabled: true
      }
    };

    logger.info('Scheduling service initialized', {
      schedulesConfigured: Object.keys(this.schedules).length,
      dailyContentEnabled: this.schedules.daily_content.enabled
    });
  }

  /**
   * Start all scheduled jobs
   */
  startScheduledJobs() {
    if (this.isRunning) {
      logger.warn('Scheduled jobs are already running');
      return;
    }

    try {
      // Daily content generation
      if (this.schedules.daily_content.enabled) {
        const dailyContentJob = cron.schedule(
          this.schedules.daily_content.cron,
          this.handleDailyContentGeneration.bind(this),
          {
            timezone: this.schedules.daily_content.timezone,
            scheduled: true
          }
        );
        this.jobs.set('daily_content', dailyContentJob);
        logger.info('Daily content generation job scheduled');
      }

      // Research updates
      if (this.schedules.research_updates.enabled) {
        const researchJob = cron.schedule(
          this.schedules.research_updates.cron,
          this.handleResearchUpdates.bind(this),
          {
            timezone: this.schedules.research_updates.timezone,
            scheduled: true
          }
        );
        this.jobs.set('research_updates', researchJob);
        logger.info('Research updates job scheduled');
      }

      // Knowledge base maintenance
      if (this.schedules.knowledge_maintenance.enabled) {
        const knowledgeJob = cron.schedule(
          this.schedules.knowledge_maintenance.cron,
          this.handleKnowledgeMaintenance.bind(this),
          {
            timezone: this.schedules.knowledge_maintenance.timezone,
            scheduled: true
          }
        );
        this.jobs.set('knowledge_maintenance', knowledgeJob);
        logger.info('Knowledge maintenance job scheduled');
      }

      // Analytics collection
      if (this.schedules.analytics_collection.enabled) {
        const analyticsJob = cron.schedule(
          this.schedules.analytics_collection.cron,
          this.handleAnalyticsCollection.bind(this),
          {
            timezone: this.schedules.analytics_collection.timezone,
            scheduled: true
          }
        );
        this.jobs.set('analytics_collection', analyticsJob);
        logger.info('Analytics collection job scheduled');
      }

      // File cleanup
      if (this.schedules.file_cleanup.enabled) {
        const cleanupJob = cron.schedule(
          this.schedules.file_cleanup.cron,
          this.handleFileCleanup.bind(this),
          {
            timezone: this.schedules.file_cleanup.timezone,
            scheduled: true
          }
        );
        this.jobs.set('file_cleanup', cleanupJob);
        logger.info('File cleanup job scheduled');
      }

      // Health checks
      if (this.schedules.health_check.enabled) {
        const healthJob = cron.schedule(
          this.schedules.health_check.cron,
          this.handleHealthCheck.bind(this),
          {
            timezone: this.schedules.health_check.timezone,
            scheduled: true
          }
        );
        this.jobs.set('health_check', healthJob);
        logger.info('Health check job scheduled');
      }

      this.isRunning = true;
      logger.info('All scheduled jobs started successfully', {
        activeJobs: this.jobs.size
      });

    } catch (error) {
      logger.error('Failed to start scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Handle daily content generation
   */
  async handleDailyContentGeneration() {
    const jobStart = Date.now();
    logger.info('Starting scheduled daily content generation');

    try {
      // Check if content already exists for today
      const todayStats = await this.contentGenerator.checkDailyLimits();
      
      if (todayStats.count >= this.contentGenerator.settings.daily_content_limit) {
        logger.info('Daily content limit already reached, skipping generation', {
          existingCount: todayStats.count,
          limit: this.contentGenerator.settings.daily_content_limit
        });
        return;
      }

      // Generate content for today
      const generationResult = await this.contentGenerator.generateDailyContent({
        generate_audio: true,
        scheduled: true
      });

      if (generationResult.success) {
        logger.info('Scheduled content generation completed successfully', {
          contentId: generationResult.content.id,
          topic: generationResult.content.topic,
          duration: `${Date.now() - jobStart}ms`
        });

        // Store generation success metrics
        await this.logScheduledJobSuccess('daily_content', {
          contentId: generationResult.content.id,
          qualityScore: generationResult.quality_check.overall_score
        });
      } else {
        throw new Error(generationResult.reason || 'Content generation failed');
      }

    } catch (error) {
      logger.error('Scheduled daily content generation failed:', error);
      await this.logScheduledJobFailure('daily_content', error);
    }
  }

  /**
   * Handle research updates
   */
  async handleResearchUpdates() {
    logger.info('Starting scheduled research updates');

    try {
      // Research trending HVAC topics
      const trendingResearch = await this.contentGenerator.anthropic.researchTopic(
        'HVAC trending topics Canada industry news',
        {
          canadianFocus: true,
          includeRegulations: true,
          timeframe: '4 hours'
        }
      );

      // Store research data
      await database.create('research_data', {
        search_query: 'scheduled_trending_research',
        data_source: 'anthropic_claude_scheduled',
        results: JSON.stringify(trendingResearch),
        category: 'trending_analysis',
        canadian_specific: true,
        urgency_level: trendingResearch.urgency_level || 'medium',
        expires_at: new Date(Date.now() + (12 * 60 * 60 * 1000)) // 12 hours
      });

      // Check for high-priority topics that need immediate content
      if (trendingResearch.urgency_level === 'emergency' || trendingResearch.urgency_level === 'high') {
        logger.info('High-priority topic detected, triggering immediate content generation', {
          urgency: trendingResearch.urgency_level,
          topic: trendingResearch.topic
        });

        // Generate urgent content
        await this.contentGenerator.generateDailyContent({
          force_topic: trendingResearch.topic,
          priority: 'urgent',
          skip_research: true
        });
      }

      await this.logScheduledJobSuccess('research_updates', {
        topicsFound: trendingResearch.content_angles?.length || 0,
        urgencyLevel: trendingResearch.urgency_level
      });

    } catch (error) {
      logger.error('Scheduled research updates failed:', error);
      await this.logScheduledJobFailure('research_updates', error);
    }
  }

  /**
   * Handle knowledge base maintenance
   */
  async handleKnowledgeMaintenance() {
    logger.info('Starting scheduled knowledge base maintenance');

    try {
      const maintenanceTasks = [];

      // 1. Verify knowledge entries that haven't been verified
      const unverifiedEntries = await database.query(`
        SELECT id, topic, content, category 
        FROM hvac_knowledge 
        WHERE verified = false 
        AND created_at >= NOW() - INTERVAL '7 days'
        LIMIT 10
      `);

      for (const entry of unverifiedEntries.rows) {
        try {
          const verification = await this.contentGenerator.knowledgeBase.verifyKnowledgeAccuracy(
            entry.content,
            entry.category,
            true // Assume Canadian-specific for verification
          );

          await database.update('hvac_knowledge', entry.id, {
            verified: verification.verified,
            verification_date: verification.verified ? new Date() : null
          });

          maintenanceTasks.push({
            task: 'verification',
            entryId: entry.id,
            success: true,
            verified: verification.verified
          });

        } catch (error) {
          logger.warn(`Failed to verify knowledge entry ${entry.id}:`, error.message);
          maintenanceTasks.push({
            task: 'verification',
            entryId: entry.id,
            success: false,
            error: error.message
          });
        }
      }

      // 2. Clean up expired research data
      const cleanupResult = await database.query(`
        DELETE FROM research_data 
        WHERE expires_at < NOW()
        RETURNING id
      `);

      maintenanceTasks.push({
        task: 'cleanup_research',
        deletedCount: cleanupResult.rowCount,
        success: true
      });

      // 3. Update knowledge base statistics
      const stats = await this.contentGenerator.knowledgeBase.getKnowledgeStats();
      
      await this.logScheduledJobSuccess('knowledge_maintenance', {
        maintenanceTasks: maintenanceTasks.length,
        verificationAttempts: unverifiedEntries.rows.length,
        cleanedResearchEntries: cleanupResult.rowCount,
        knowledgeBaseStats: stats.overview
      });

    } catch (error) {
      logger.error('Scheduled knowledge maintenance failed:', error);
      await this.logScheduledJobFailure('knowledge_maintenance', error);
    }
  }

  /**
   * Handle analytics collection
   */
  async handleAnalyticsCollection() {
    logger.info('Starting scheduled analytics collection');

    try {
      // Collect analytics for recent content
      const recentContent = await database.query(`
        SELECT id, topic, content_type, status, created_at
        FROM content_calendar 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status IN ('published', 'ready')
      `);

      const analyticsData = [];

      for (const content of recentContent.rows) {
        // TODO: Collect actual analytics from social media platforms
        // For now, simulate analytics collection
        const simulatedAnalytics = {
          content_id: content.id,
          platform: 'youtube',
          views: Math.floor(Math.random() * 1000) + 100,
          likes: Math.floor(Math.random() * 50) + 5,
          shares: Math.floor(Math.random() * 20) + 1,
          comments: Math.floor(Math.random() * 30) + 2,
          engagement_rate: (Math.random() * 10 + 2).toFixed(2),
          click_through_rate: (Math.random() * 5 + 1).toFixed(2),
          lark_labs_clicks: Math.floor(Math.random() * 20) + 1,
          recorded_at: new Date()
        };

        // Store analytics
        await database.create('content_analytics', simulatedAnalytics);
        analyticsData.push(simulatedAnalytics);
      }

      await this.logScheduledJobSuccess('analytics_collection', {
        contentPiecesAnalyzed: recentContent.rows.length,
        analyticsRecordsCreated: analyticsData.length
      });

    } catch (error) {
      logger.error('Scheduled analytics collection failed:', error);
      await this.logScheduledJobFailure('analytics_collection', error);
    }
  }

  /**
   * Handle file cleanup
   */
  async handleFileCleanup() {
    logger.info('Starting scheduled file cleanup');

    try {
      // Clean up old audio files
      const audioCleanupCount = await this.contentGenerator.voiceEngine.cleanupOldAudio(7);

      // TODO: Clean up old video files, logs, etc.
      
      await this.logScheduledJobSuccess('file_cleanup', {
        audioFilesRemoved: audioCleanupCount
      });

    } catch (error) {
      logger.error('Scheduled file cleanup failed:', error);
      await this.logScheduledJobFailure('file_cleanup', error);
    }
  }

  /**
   * Handle health checks
   */
  async handleHealthCheck() {
    logger.debug('Running scheduled health check');

    try {
      // Check AI services health
      const anthropicHealth = await this.contentGenerator.anthropic.healthCheck();
      const voiceHealth = await this.contentGenerator.voiceEngine.healthCheck();
      
      // Check database connectivity
      const dbHealthy = await this.checkDatabaseHealth();

      // Check content generation system status
      const generatorStatus = await this.contentGenerator.getGeneratorStatus();

      const healthStatus = {
        anthropic: anthropicHealth,
        voice_synthesis: voiceHealth,
        database: dbHealthy,
        content_generator: generatorStatus,
        overall_healthy: anthropicHealth.healthy && voiceHealth.healthy && dbHealthy,
        timestamp: new Date().toISOString()
      };

      if (!healthStatus.overall_healthy) {
        logger.warn('System health check found issues:', {
          anthropicHealthy: anthropicHealth.healthy,
          voiceHealthy: voiceHealth.healthy,
          dbHealthy: dbHealthy
        });
      }

      // Log health status (only log every 4th health check to reduce noise)
      if (Math.random() < 0.25) {
        await this.logScheduledJobSuccess('health_check', healthStatus);
      }

    } catch (error) {
      logger.error('Scheduled health check failed:', error);
      await this.logScheduledJobFailure('health_check', error);
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      await database.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Log successful job execution
   */
  async logScheduledJobSuccess(jobName, data) {
    logger.info(`Scheduled job '${jobName}' completed successfully`, data);
    
    // TODO: Store job execution logs in database for monitoring dashboard
  }

  /**
   * Log failed job execution
   */
  async logScheduledJobFailure(jobName, error) {
    logger.error(`Scheduled job '${jobName}' failed:`, {
      error: error.message,
      stack: error.stack
    });

    // TODO: Store failure logs and potentially send alerts
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduledJobs() {
    if (!this.isRunning) {
      logger.warn('Scheduled jobs are not running');
      return;
    }

    try {
      this.jobs.forEach((job, name) => {
        job.stop();
        logger.debug(`Stopped scheduled job: ${name}`);
      });

      this.jobs.clear();
      this.isRunning = false;

      logger.info('All scheduled jobs stopped successfully');

    } catch (error) {
      logger.error('Failed to stop scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getSchedulerStatus() {
    return {
      is_running: this.isRunning,
      active_jobs: Array.from(this.jobs.keys()),
      schedules: this.schedules,
      next_executions: this.getNextExecutions()
    };
  }

  /**
   * Get next execution times for all jobs
   */
  getNextExecutions() {
    const nextExecutions = {};
    
    this.jobs.forEach((job, name) => {
      try {
        // Get next execution time (this is a simplified version)
        nextExecutions[name] = 'Next execution calculation would go here';
      } catch (error) {
        nextExecutions[name] = 'Error calculating next execution';
      }
    });

    return nextExecutions;
  }

  /**
   * Manually trigger a specific job
   */
  async triggerJob(jobName) {
    logger.info(`Manually triggering job: ${jobName}`);

    switch (jobName) {
      case 'daily_content':
        return await this.handleDailyContentGeneration();
      case 'research_updates':
        return await this.handleResearchUpdates();
      case 'knowledge_maintenance':
        return await this.handleKnowledgeMaintenance();
      case 'analytics_collection':
        return await this.handleAnalyticsCollection();
      case 'file_cleanup':
        return await this.handleFileCleanup();
      case 'health_check':
        return await this.handleHealthCheck();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Export singleton instance
const schedulingService = new SchedulingService();

/**
 * Start scheduled jobs (called from server.js)
 */
function startScheduledJobs() {
  schedulingService.startScheduledJobs();
}

/**
 * Stop scheduled jobs (called during shutdown)
 */
function stopScheduledJobs() {
  schedulingService.stopScheduledJobs();
}

module.exports = {
  startScheduledJobs,
  stopScheduledJobs,
  schedulingService
};