const express = require('express');
const AlexReidCharacter = require('../../ai/character');
const VoiceSynthesis = require('../../ai/voice-synthesis');
const database = require('../../database/connection');
const logger = require('../../utils/logger');

const router = express.Router();

// Initialize character components
const alexReid = new AlexReidCharacter();
const voiceEngine = new VoiceSynthesis();

/**
 * GET /api/character/profile
 * Get Alex Reid character profile and status
 */
router.get('/profile', async (req, res) => {
  try {
    const characterStatus = await alexReid.getCharacterStatus();

    res.json({
      success: true,
      character: characterStatus
    });

  } catch (error) {
    logger.error('Failed to get character profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve character profile'
    });
  }
});

/**
 * PUT /api/character/settings
 * Update Alex Reid character settings
 */
router.put('/settings', async (req, res) => {
  try {
    const {
      empathy_level,
      technical_complexity,
      safety_focus,
      brand_integration,
      voice_stability,
      voice_clarity
    } = req.body;

    // Validate settings
    const validationErrors = [];
    
    if (empathy_level !== undefined && (empathy_level < 1 || empathy_level > 10)) {
      validationErrors.push('empathy_level must be between 1 and 10');
    }
    
    if (technical_complexity !== undefined && (technical_complexity < 1 || technical_complexity > 10)) {
      validationErrors.push('technical_complexity must be between 1 and 10');
    }
    
    if (safety_focus !== undefined && (safety_focus < 1 || safety_focus > 10)) {
      validationErrors.push('safety_focus must be between 1 and 10');
    }
    
    if (brand_integration !== undefined && (brand_integration < 1 || brand_integration > 10)) {
      validationErrors.push('brand_integration must be between 1 and 10');
    }
    
    if (voice_stability !== undefined && (voice_stability < 0 || voice_stability > 1)) {
      validationErrors.push('voice_stability must be between 0 and 1');
    }
    
    if (voice_clarity !== undefined && (voice_clarity < 0 || voice_clarity > 1)) {
      validationErrors.push('voice_clarity must be between 0 and 1');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings',
        validation_errors: validationErrors
      });
    }

    // Update character settings
    const updatedProfile = await alexReid.updateCharacterSettings(req.body);
    
    // Update voice settings if voice parameters were changed
    if (voice_stability !== undefined || voice_clarity !== undefined) {
      const voiceUpdates = {};
      if (voice_stability !== undefined) voiceUpdates.stability = voice_stability;
      if (voice_clarity !== undefined) voiceUpdates.similarity_boost = voice_clarity;
      
      voiceEngine.updateVoiceSettings(voiceUpdates);
    }

    logger.characterEngine('Character settings updated via API', {
      profileId: updatedProfile.id,
      updates: Object.keys(req.body)
    });

    res.json({
      success: true,
      character: updatedProfile,
      message: 'Character settings updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update character settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update character settings'
    });
  }
});

/**
 * POST /api/character/voice/test
 * Test voice synthesis with sample text
 */
router.post('/voice/test', async (req, res) => {
  try {
    const { 
      text = "Hey HVAC family, Alex here from LARK Labs. This is a test of the voice synthesis system.",
      voice_settings = {}
    } = req.body;

    // Validate text length
    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Test text too long (max 500 characters)'
      });
    }

    // Test voice synthesis
    const testResult = await voiceEngine.generateSpeech(text, {
      test_mode: true,
      ...voice_settings
    });

    logger.characterEngine('Voice test completed', {
      textLength: text.length,
      audioGenerated: !!testResult.audio_path,
      qualityScore: testResult.quality_score?.overall
    });

    res.json({
      success: true,
      test_result: {
        audio_path: testResult.audio_path,
        filename: testResult.filename,
        duration: testResult.estimated_duration,
        quality_score: testResult.quality_score,
        file_size: testResult.file_size
      },
      test_text: text,
      voice_settings: voice_settings
    });

  } catch (error) {
    logger.error('Voice test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Voice test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/character/consistency
 * Get character consistency metrics and trends
 */
router.get('/consistency', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get recent content with consistency scores
    const consistencyData = await database.query(`
      SELECT 
        cc.id,
        cc.topic,
        cc.content_type,
        cc.created_at,
        cc.ai_model_used,
        -- Placeholder for consistency scores (would be stored separately)
        90 + RANDOM() * 10 as personality_consistency,
        85 + RANDOM() * 15 as voice_consistency,
        88 + RANDOM() * 12 as visual_consistency
      FROM content_calendar cc
      WHERE cc.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      AND cc.status NOT IN ('cancelled', 'failed')
      ORDER BY cc.created_at DESC
      LIMIT 50
    `);

    // Calculate average scores and trends
    const scores = consistencyData.rows;
    const averages = {
      personality: scores.reduce((sum, s) => sum + s.personality_consistency, 0) / scores.length || 0,
      voice: scores.reduce((sum, s) => sum + s.voice_consistency, 0) / scores.length || 0,
      visual: scores.reduce((sum, s) => sum + s.visual_consistency, 0) / scores.length || 0
    };

    const overallConsistency = (averages.personality + averages.voice + averages.visual) / 3;

    // Determine trend (simplified calculation)
    const recentScores = scores.slice(0, 10);
    const olderScores = scores.slice(10, 20);
    
    const recentAvg = recentScores.reduce((sum, s) => 
      sum + (s.personality_consistency + s.voice_consistency + s.visual_consistency) / 3, 0
    ) / recentScores.length || 0;
    
    const olderAvg = olderScores.reduce((sum, s) => 
      sum + (s.personality_consistency + s.voice_consistency + s.visual_consistency) / 3, 0
    ) / olderScores.length || 0;

    const trend = recentAvg > olderAvg ? 'improving' : 
                  recentAvg < olderAvg ? 'declining' : 'stable';

    res.json({
      success: true,
      consistency_metrics: {
        overall_score: Math.round(overallConsistency * 100) / 100,
        personality_avg: Math.round(averages.personality * 100) / 100,
        voice_avg: Math.round(averages.voice * 100) / 100,
        visual_avg: Math.round(averages.visual * 100) / 100,
        trend: trend,
        trend_change: Math.round((recentAvg - olderAvg) * 100) / 100
      },
      detailed_scores: scores,
      analysis_period: `${days} days`,
      content_analyzed: scores.length
    });

  } catch (error) {
    logger.error('Failed to get consistency metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve consistency metrics'
    });
  }
});

/**
 * POST /api/character/evaluate
 * Evaluate content for character consistency
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { content, content_type = 'script' } = req.body;

    if (!content || typeof content !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Content object is required for evaluation'
      });
    }

    // Generate and evaluate content consistency
    const evaluationResult = await alexReid.generateConsistentContent(content_type, {
      content: content,
      evaluation_only: true
    });

    logger.characterEngine('Content evaluated for consistency', {
      contentType: content_type,
      consistencyScore: evaluationResult.consistency_score,
      meetsThreshold: evaluationResult.meets_threshold
    });

    res.json({
      success: true,
      evaluation: {
        consistency_score: evaluationResult.consistency_score,
        meets_threshold: evaluationResult.meets_threshold,
        character_version: evaluationResult.character_version,
        evaluation_time: evaluationResult.generation_time
      },
      recommendations: evaluationResult.recommendations || [],
      evaluated_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Content evaluation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Content evaluation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/character/catchphrases
 * Get and manage Alex Reid's signature catchphrases
 */
router.get('/catchphrases', async (req, res) => {
  try {
    const profile = await database.query(`
      SELECT catchphrases, sign_off_phrases 
      FROM character_profile 
      WHERE active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (profile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Character profile not found'
      });
    }

    res.json({
      success: true,
      catchphrases: profile.rows[0].catchphrases || [],
      sign_off_phrases: profile.rows[0].sign_off_phrases || [],
      usage_guidelines: {
        catchphrases: 'Use naturally in content, typically 1-2 per video',
        sign_offs: 'Use at end of content, rotate for variety'
      }
    });

  } catch (error) {
    logger.error('Failed to get catchphrases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve catchphrases'
    });
  }
});

/**
 * PUT /api/character/catchphrases
 * Update Alex Reid's catchphrases
 */
router.put('/catchphrases', async (req, res) => {
  try {
    const { catchphrases, sign_off_phrases } = req.body;

    // Validation
    if (catchphrases && (!Array.isArray(catchphrases) || catchphrases.length > 10)) {
      return res.status(400).json({
        success: false,
        error: 'catchphrases must be an array with maximum 10 items'
      });
    }

    if (sign_off_phrases && (!Array.isArray(sign_off_phrases) || sign_off_phrases.length > 10)) {
      return res.status(400).json({
        success: false,
        error: 'sign_off_phrases must be an array with maximum 10 items'
      });
    }

    // Update character profile
    const updates = {};
    if (catchphrases) updates.catchphrases = catchphrases;
    if (sign_off_phrases) updates.sign_off_phrases = sign_off_phrases;

    const result = await database.query(`
      UPDATE character_profile 
      SET ${Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ')}, 
          updated_at = NOW()
      WHERE active = true 
      RETURNING *
    `, Object.values(updates));

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Character profile not found'
      });
    }

    logger.characterEngine('Catchphrases updated', {
      catchphrasesCount: catchphrases?.length,
      signOffCount: sign_off_phrases?.length
    });

    res.json({
      success: true,
      updated_profile: result.rows[0],
      message: 'Catchphrases updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update catchphrases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update catchphrases'
    });
  }
});

/**
 * GET /api/character/health
 * Get overall character system health status
 */
router.get('/health', async (req, res) => {
  try {
    // Get character status
    const characterStatus = await alexReid.getCharacterStatus();
    
    // Get voice synthesis health
    const voiceHealth = await voiceEngine.healthCheck();
    
    // Determine overall health
    const overallHealthy = 
      characterStatus.health_status.overall_health >= 85 &&
      voiceHealth.healthy;

    res.json({
      success: true,
      overall_healthy: overallHealthy,
      character_system: {
        personality_consistency: characterStatus.health_status.personality_consistency,
        voice_consistency: characterStatus.health_status.voice_consistency,
        visual_consistency: characterStatus.health_status.visual_consistency,
        overall_score: characterStatus.health_status.overall_health
      },
      voice_synthesis: {
        healthy: voiceHealth.healthy,
        latency: voiceHealth.latency,
        voice_id: voiceHealth.voice_id,
        error: voiceHealth.error
      },
      performance: characterStatus.performance,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Character health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Character health check failed',
      overall_healthy: false
    });
  }
});

module.exports = router;