const AnthropicClient = require('./anthropic-client');
const database = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Alex Reid Character Engine
 * Manages the AI character's personality, consistency, and behavioral patterns
 */
class AlexReidCharacter {
  constructor() {
    this.anthropic = new AnthropicClient();
    this.characterProfile = null;
    this.consistencyThreshold = 95; // Minimum consistency score required
    
    // Core personality traits
    this.coreTraits = {
      empathy_level: 8,
      technical_expertise: 9,
      safety_focus: 10,
      patience_level: 9,
      community_building: 8,
      approachability: 8
    };

    // Signature elements
    this.signatures = {
      catchphrases: [
        "Safety first, solutions second, success follows",
        "Let's troubleshoot this together",
        "Remember, every expert was once a beginner",
        "The LARK Labs way: smart tools, smarter technicians"
      ],
      sign_offs: [
        "Stay safe out there",
        "See you next week, HVAC family",
        "Keep learning, keep growing",
        "Until next time, stay safe and stay curious"
      ],
      community_language: [
        "HVAC family",
        "Let's work through this together",
        "We've all been there",
        "Your experience matters"
      ]
    };

    this.initializeCharacter();
  }

  /**
   * Initialize character profile from database
   */
  async initializeCharacter() {
    try {
      const profiles = await database.findMany('character_profile', { active: true });
      
      if (profiles.length > 0) {
        this.characterProfile = profiles[0];
        logger.characterEngine('Character profile loaded', {
          name: this.characterProfile.name,
          version: this.characterProfile.version
        });
      } else {
        // Create default profile if none exists
        await this.createDefaultProfile();
      }
    } catch (error) {
      logger.error('Failed to initialize character profile:', error);
      throw error;
    }
  }

  /**
   * Create default Alex Reid character profile
   */
  async createDefaultProfile() {
    const defaultProfile = {
      name: 'Alex Reid',
      version: '1.0',
      empathy_level: this.coreTraits.empathy_level,
      technical_complexity: 7,
      safety_focus: this.coreTraits.safety_focus,
      brand_integration: 7,
      voice_stability: 0.85,
      voice_clarity: 0.90,
      visual_style: JSON.stringify({
        age: 'mid-30s',
        attire: 'LARK Labs branded polo, clean work pants',
        setting: 'modern training facility with HVAC equipment',
        lighting: 'bright, professional, educational',
        props: 'modern HVAC tools, tablet showing LARK Labs apps'
      }),
      catchphrases: this.signatures.catchphrases,
      sign_off_phrases: this.signatures.sign_offs,
      active: true
    };

    this.characterProfile = await database.create('character_profile', defaultProfile);
    
    logger.characterEngine('Default character profile created', {
      profileId: this.characterProfile.id
    });
  }

  /**
   * Generate content with character consistency
   * @param {string} contentType - Type of content (script, response, etc.)
   * @param {Object} params - Content parameters
   * @returns {Promise<Object>} - Generated content with consistency metrics
   */
  async generateConsistentContent(contentType, params) {
    const startTime = Date.now();
    
    try {
      // Add character context to prompt
      const characterContext = this.buildCharacterContext();
      const enhancedParams = {
        ...params,
        characterContext
      };

      let generatedContent;
      
      switch (contentType) {
        case 'script':
          generatedContent = await this.anthropic.generateHVACScript(enhancedParams);
          break;
        case 'social_post':
          generatedContent = await this.anthropic.generateSocialPosts(enhancedParams);
          break;
        case 'community_response':
          generatedContent = await this.anthropic.analyzeAndRespond(enhancedParams);
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      // Evaluate consistency
      const consistencyScore = await this.evaluateConsistency(generatedContent, contentType);
      
      const result = {
        content: generatedContent,
        consistency_score: consistencyScore,
        character_version: this.characterProfile.version,
        generation_time: Date.now() - startTime,
        meets_threshold: consistencyScore >= this.consistencyThreshold
      };

      // Log consistency metrics
      logger.characterEngine('Content generated with consistency check', {
        contentType,
        consistencyScore,
        meetsThreshold: result.meets_threshold,
        duration: result.generation_time
      });

      return result;

    } catch (error) {
      logger.error('Character content generation failed:', {
        contentType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build character context for AI prompts
   */
  buildCharacterContext() {
    return `
CHARACTER PROFILE - Alex Reid:
Name: ${this.characterProfile.name}
Background: 20+ years HVAC field experience, passionate educator
Personality Traits:
- Empathy Level: ${this.characterProfile.empathy_level}/10
- Safety Focus: ${this.characterProfile.safety_focus}/10
- Technical Expertise: Highly knowledgeable but explains simply
- Teaching Style: Patient, encouraging, uses "we" language

Communication Style:
- Never makes anyone feel stupid for asking questions
- Acknowledges difficulties honestly: "We've all been there"
- Celebrates small wins and progress
- Uses inclusive community language
- Always emphasizes safety procedures
- Bridges traditional skills with modern technology

Signature Elements:
- Catchphrases: ${this.characterProfile.catchphrases.join(', ')}
- Sign-offs: ${this.characterProfile.sign_off_phrases.join(', ')}
- Community references: "HVAC family", "Let's troubleshoot together"

Brand Integration:
- LARK Labs tools and resources mentioned naturally (not forced)
- Professional but approachable representation
- Focus on education over sales

Visual Identity:
- Professional HVAC educator appearance
- LARK Labs branded clothing
- Clean, educational workshop setting
- Modern tools and technology visible
`;
  }

  /**
   * Evaluate content consistency with Alex Reid character
   * @param {Object} content - Generated content to evaluate
   * @param {string} contentType - Type of content
   * @returns {Promise<number>} - Consistency score (0-100)
   */
  async evaluateConsistency(content, contentType) {
    const evaluationPrompt = `
Evaluate how well this generated content matches the Alex Reid character from LARK Labs:

CONTENT TO EVALUATE:
${JSON.stringify(content, null, 2)}

ALEX REID CHARACTER REQUIREMENTS:
- Empathetic and supportive tone
- Safety-first mentality  
- Uses "we" and inclusive language
- Patient teacher approach
- Professional but approachable
- Acknowledges learning difficulties
- Uses signature phrases naturally
- Appropriate LARK Labs brand integration
- Technical accuracy with clear explanations

EVALUATION CRITERIA (score each 0-10):
1. Tone and Empathy: Does it sound supportive and understanding?
2. Safety Focus: Are safety considerations properly emphasized?
3. Teaching Style: Is it patient and encouraging?
4. Language Use: Appropriate use of "we" language and community building?
5. Technical Accuracy: Sound HVAC knowledge presented clearly?
6. Brand Integration: Natural LARK Labs references without being pushy?
7. Character Consistency: Matches established Alex Reid personality?
8. Authenticity: Sounds like a real experienced HVAC professional?

Return only a JSON object with scores:
{
  "tone_empathy": 8,
  "safety_focus": 9,
  "teaching_style": 8,
  "language_use": 7,
  "technical_accuracy": 9,
  "brand_integration": 8,
  "character_consistency": 8,
  "authenticity": 8,
  "overall_score": 82.5,
  "feedback": "Brief feedback on areas for improvement"
}
`;

    try {
      const evaluation = await this.anthropic.generateContent(evaluationPrompt, {
        maxTokens: 1000,
        temperature: 0.3 // Low temperature for consistent evaluation
      });

      const jsonMatch = evaluation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scores = JSON.parse(jsonMatch[0]);
        
        // Update character consistency metrics
        await this.updateConsistencyMetrics(scores);
        
        return scores.overall_score;
      } else {
        logger.warn('Failed to parse consistency evaluation, returning default score');
        return 75; // Default score if parsing fails
      }

    } catch (error) {
      logger.error('Consistency evaluation failed:', error.message);
      return 70; // Conservative default score on error
    }
  }

  /**
   * Update character consistency metrics in database
   */
  async updateConsistencyMetrics(scores) {
    try {
      const updates = {
        personality_consistency_score: scores.overall_score,
        updated_at: new Date()
      };

      await database.update('character_profile', this.characterProfile.id, updates);
      
      // Update in-memory profile
      this.characterProfile.personality_consistency_score = scores.overall_score;
      
    } catch (error) {
      logger.error('Failed to update consistency metrics:', error);
    }
  }

  /**
   * Get character profile and performance metrics
   */
  async getCharacterStatus() {
    try {
      // Get latest profile data
      const profile = await database.findById('character_profile', this.characterProfile.id);
      
      // Calculate recent performance trends
      const recentAnalytics = await database.query(`
        SELECT 
          AVG(ca.engagement_rate) as avg_engagement,
          COUNT(*) as content_count
        FROM content_analytics ca
        JOIN content_calendar cc ON ca.content_id = cc.id
        WHERE cc.created_at >= NOW() - INTERVAL '30 days'
      `);

      return {
        character: profile,
        performance: {
          avg_engagement: recentAnalytics.rows[0]?.avg_engagement || 0,
          content_count: parseInt(recentAnalytics.rows[0]?.content_count) || 0,
          consistency_trend: profile.personality_consistency_score >= this.consistencyThreshold ? 'stable' : 'needs_improvement'
        },
        health_status: {
          personality_consistency: profile.personality_consistency_score,
          voice_consistency: profile.voice_consistency_score,
          visual_consistency: profile.visual_consistency_score,
          overall_health: this.calculateOverallHealth(profile)
        }
      };

    } catch (error) {
      logger.error('Failed to get character status:', error);
      throw error;
    }
  }

  /**
   * Calculate overall character health score
   */
  calculateOverallHealth(profile) {
    const weights = {
      personality: 0.4,
      voice: 0.3,
      visual: 0.3
    };

    const scores = {
      personality: profile.personality_consistency_score || 0,
      voice: profile.voice_consistency_score || 0,
      visual: profile.visual_consistency_score || 0
    };

    const weightedScore = Object.keys(weights).reduce((total, key) => {
      return total + (scores[key] * weights[key]);
    }, 0);

    return Math.round(weightedScore);
  }

  /**
   * Update character settings
   * @param {Object} updates - Character setting updates
   */
  async updateCharacterSettings(updates) {
    try {
      const allowedUpdates = [
        'empathy_level',
        'technical_complexity', 
        'safety_focus',
        'brand_integration',
        'voice_stability',
        'voice_clarity'
      ];

      const validUpdates = Object.keys(updates)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      if (Object.keys(validUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }

      const updatedProfile = await database.update(
        'character_profile',
        this.characterProfile.id,
        validUpdates
      );

      this.characterProfile = updatedProfile;

      logger.characterEngine('Character settings updated', {
        profileId: this.characterProfile.id,
        updates: Object.keys(validUpdates)
      });

      return updatedProfile;

    } catch (error) {
      logger.error('Failed to update character settings:', error);
      throw error;
    }
  }
}

module.exports = AlexReidCharacter;