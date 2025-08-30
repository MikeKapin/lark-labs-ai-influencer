const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class AnthropicClient {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Primary model configuration
    this.primaryModel = 'claude-3-5-sonnet-20241022';
    this.maxTokens = 4000;
    this.temperature = 0.7;
    
    logger.info('Anthropic Claude client initialized with primary model:', this.primaryModel);
  }

  /**
   * Generate content using Claude with web search capabilities
   * @param {string} prompt - The prompt for content generation
   * @param {Object} options - Additional options for the request
   * @returns {Promise<string>} - Generated content
   */
  async generateContent(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.aiGeneration('Starting content generation with Claude', {
        promptLength: prompt.length,
        model: options.model || this.primaryModel,
        maxTokens: options.maxTokens || this.maxTokens
      });

      const response = await this.client.messages.create({
        model: options.model || this.primaryModel,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const generatedContent = response.content[0].text;
      const duration = Date.now() - startTime;

      logger.aiGeneration('Content generation completed', {
        duration: `${duration}ms`,
        outputLength: generatedContent.length,
        usage: response.usage
      });

      return generatedContent;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Anthropic API error:', {
        duration: `${duration}ms`,
        error: error.message,
        promptLength: prompt.length
      });
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Research HVAC industry topics with web search
   * @param {string} topic - The topic to research
   * @param {Object} options - Research options
   * @returns {Promise<Object>} - Research results with sources
   */
  async researchTopic(topic, options = {}) {
    const { 
      canadianFocus = true, 
      includeRegulations = true, 
      timeframe = '30 days' 
    } = options;

    const researchPrompt = `
Research the latest information about: ${topic}

Requirements:
1. Search the web for current information from the past ${timeframe}
2. ${canadianFocus ? 'Focus specifically on Canadian HVAC industry, CSA standards, and provincial regulations' : 'Include general North American information'}
3. ${includeRegulations ? 'Include any relevant code changes, safety alerts, or regulatory updates' : ''}
4. Look for practical implications for HVAC technicians
5. Identify trending discussions or common problems
6. Find any emergency alerts or safety recalls

Please provide:
1. Key findings with sources
2. Relevance to HVAC technicians (1-10 score)
3. Urgency level (low/medium/high/emergency)
4. Suggested content angles
5. Canadian-specific considerations (if applicable)
6. Safety implications (if any)

Format as structured JSON with the following schema:
{
  "topic": "${topic}",
  "findings": [
    {
      "title": "Finding title",
      "summary": "Brief summary",
      "source": "Source URL or publication",
      "relevance_score": 8,
      "date": "2024-01-01"
    }
  ],
  "urgency_level": "medium",
  "content_angles": ["Angle 1", "Angle 2"],
  "canadian_specific": true,
  "safety_implications": "Safety considerations if any",
  "recommended_action": "Immediate/Scheduled content creation"
}
`;

    try {
      const response = await this.generateContent(researchPrompt, {
        maxTokens: 3000,
        temperature: 0.3 // Lower temperature for more factual research
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const researchData = JSON.parse(jsonMatch[0]);
        
        logger.aiGeneration('Research completed successfully', {
          topic,
          findingsCount: researchData.findings?.length || 0,
          urgencyLevel: researchData.urgency_level,
          canadianSpecific: researchData.canadian_specific
        });

        return researchData;
      } else {
        throw new Error('Failed to parse research response as JSON');
      }

    } catch (error) {
      logger.error('Research topic failed:', {
        topic,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate HVAC educational script with Alex Reid personality
   * @param {Object} params - Script generation parameters
   * @returns {Promise<Object>} - Generated script with metadata
   */
  async generateHVACScript(params) {
    const {
      topic,
      targetAudience = 'hvac_technicians',
      contentType = 'technical',
      duration = 10,
      canadianFocus = true,
      safetyFocus = true,
      difficultyLevel = 3,
      researchContext = null
    } = params;

    const scriptPrompt = `
You are Alex Reid, an empathetic HVAC educator from LARK Labs with 20+ years of field experience. Create a comprehensive educational video script about: ${topic}

CHARACTER PROFILE - Alex Reid:
- Empathetic mentor who understands learning struggles
- Always prioritizes safety procedures
- Bridges traditional HVAC knowledge with modern tools
- Patient teacher who uses "we" language
- Professional but approachable tone
- Celebrates small wins and acknowledges difficulties honestly

TARGET AUDIENCE: ${targetAudience}
CONTENT TYPE: ${contentType}
VIDEO DURATION: ${duration} minutes
DIFFICULTY LEVEL: ${difficultyLevel}/5
CANADIAN FOCUS: ${canadianFocus}
SAFETY EMPHASIS: ${safetyFocus}

${researchContext ? `CURRENT INDUSTRY CONTEXT:\n${JSON.stringify(researchContext, null, 2)}\n` : ''}

REQUIREMENTS:
1. ${canadianFocus ? 'Use metric measurements, reference CSA standards, consider Canadian climate' : 'Use standard industry measurements'}
2. ${safetyFocus ? 'Always emphasize safety procedures and proper PPE' : ''}
3. Include practical, real-world examples from field experience
4. Use Alex Reid's signature phrases naturally
5. Reference LARK Labs tools and resources where appropriate (not forced)
6. Structure for ${duration}-minute video with clear timestamps
7. Include visual cues and demonstration notes
8. Add empathetic touches that acknowledge common struggles
9. End with clear call-to-action for LARK Labs resources

SIGNATURE PHRASES (use naturally):
- "Safety first, solutions second, success follows"
- "Let's troubleshoot this together"  
- "Remember, every expert was once a beginner"
- "Stay safe out there"

FORMAT:
Return a detailed script with:
- Intro (0:00-0:30)
- Main content sections with timestamps
- Visual demonstration cues
- Safety callouts
- Outro with LARK Labs CTA (last 30 seconds)
- Suggested title and description
- Key learning objectives
- Required visual elements

Make it authentic, educational, and genuinely helpful for HVAC professionals.
`;

    try {
      const scriptContent = await this.generateContent(scriptPrompt, {
        maxTokens: 4000,
        temperature: 0.8 // Higher temperature for more creative, natural script
      });

      // Extract components from the generated script
      const titleMatch = scriptContent.match(/Title:\s*(.+)/i);
      const descriptionMatch = scriptContent.match(/Description:\s*([\s\S]*?)(?=\n\n|\nKey Learning|$)/i);
      
      const result = {
        script: scriptContent,
        title: titleMatch ? titleMatch[1].trim() : `${topic} - HVAC Education with Alex Reid`,
        description: descriptionMatch ? descriptionMatch[1].trim() : `Educational HVAC content about ${topic} from Alex Reid at LARK Labs`,
        duration: duration,
        difficulty_level: difficultyLevel,
        canadian_specific: canadianFocus,
        safety_related: safetyFocus,
        target_audience: targetAudience,
        content_type: contentType,
        generated_at: new Date().toISOString(),
        ai_model: this.primaryModel
      };

      logger.contentCreation('HVAC script generated successfully', {
        topic,
        scriptLength: scriptContent.length,
        duration,
        difficulty: difficultyLevel
      });

      return result;

    } catch (error) {
      logger.error('HVAC script generation failed:', {
        topic,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate social media posts adapted from video content
   * @param {Object} videoContent - The video content to adapt
   * @param {Array<string>} platforms - Target platforms
   * @returns {Promise<Object>} - Social media posts for each platform
   */
  async generateSocialPosts(videoContent, platforms = ['youtube', 'linkedin', 'facebook']) {
    const socialPrompt = `
As Alex Reid from LARK Labs, create social media posts to promote this HVAC educational video:

VIDEO TITLE: ${videoContent.title}
VIDEO DESCRIPTION: ${videoContent.description}
KEY TOPIC: ${videoContent.topic || 'HVAC Education'}
TARGET AUDIENCE: HVAC technicians and students

Create posts for these platforms: ${platforms.join(', ')}

ALEX REID CHARACTER:
- Empathetic and supportive tone
- Professional but approachable
- Uses community-building language ("we", "our HVAC family")
- Acknowledges learning challenges
- Always includes value proposition

PLATFORM REQUIREMENTS:
- YouTube: Video description with timestamps, SEO keywords, call-to-action
- LinkedIn: Professional post for HVAC network, industry insights
- Facebook: Community-focused post encouraging engagement

Each post should:
1. Hook the reader with a relatable problem or question
2. Tease the solution without giving it all away
3. Include relevant hashtags
4. Have a clear call-to-action
5. Maintain Alex Reid's empathetic, mentoring voice
6. Reference LARK Labs appropriately

Return as JSON:
{
  "youtube": {
    "description": "Full YouTube description",
    "tags": ["tag1", "tag2"],
    "title": "Optimized video title"
  },
  "linkedin": {
    "post": "LinkedIn post content",
    "hashtags": ["#HVAC", "#Education"]
  },
  "facebook": {
    "post": "Facebook post content", 
    "hashtags": ["#HVAC", "#LarkLabs"]
  }
}
`;

    try {
      const response = await this.generateContent(socialPrompt, {
        maxTokens: 2000,
        temperature: 0.7
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const socialPosts = JSON.parse(jsonMatch[0]);
        
        logger.socialMedia('Social media posts generated', {
          platforms: Object.keys(socialPosts),
          topic: videoContent.topic
        });

        return socialPosts;
      } else {
        throw new Error('Failed to parse social media response');
      }

    } catch (error) {
      logger.error('Social media generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze community engagement and generate responses
   * @param {Object} interaction - Community interaction data
   * @returns {Promise<Object>} - Suggested response and analysis
   */
  async analyzeAndRespond(interaction) {
    const responsePrompt = `
As Alex Reid from LARK Labs, analyze this community interaction and provide a response:

INTERACTION DETAILS:
Platform: ${interaction.platform}
Type: ${interaction.interaction_type}
User: ${interaction.user_handle} (${interaction.user_type || 'unknown'})
Message: "${interaction.message}"
Context: ${interaction.content_id ? `Related to video about ${interaction.topic || 'HVAC education'}` : 'General interaction'}

ALEX REID RESPONSE GUIDELINES:
1. Always be empathetic and supportive
2. Acknowledge the person's experience or question
3. Provide helpful, accurate technical information
4. Use encouraging language
5. Never make anyone feel stupid for asking questions
6. Reference additional LARK Labs resources when relevant
7. Build community with inclusive language
8. If it's a safety issue, emphasize proper procedures

ANALYSIS NEEDED:
1. Sentiment analysis (positive/neutral/negative)
2. Topics mentioned
3. Question type (technical/career/safety/general)
4. Response priority (high/medium/low)
5. Suggested response tone

Return JSON:
{
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2"],
  "question_type": "technical|career|safety|general",
  "priority": "high|medium|low",
  "requires_expert_review": false,
  "suggested_response": "Your empathetic Alex Reid response here",
  "additional_resources": ["resource1", "resource2"],
  "follow_up_content_ideas": ["idea1", "idea2"]
}
`;

    try {
      const response = await this.generateContent(responsePrompt, {
        maxTokens: 1500,
        temperature: 0.6
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        
        logger.characterEngine('Community interaction analyzed', {
          platform: interaction.platform,
          sentiment: analysisResult.sentiment,
          priority: analysisResult.priority,
          requiresReview: analysisResult.requires_expert_review
        });

        return analysisResult;
      } else {
        throw new Error('Failed to parse interaction analysis');
      }

    } catch (error) {
      logger.error('Community interaction analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Health check for the Anthropic API
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      const testResponse = await this.client.messages.create({
        model: this.primaryModel,
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: 'Respond with "OK" if you are functioning properly.'
        }]
      });

      const duration = Date.now() - startTime;
      const isHealthy = testResponse.content[0].text.toLowerCase().includes('ok');

      return {
        healthy: isHealthy,
        latency: duration,
        model: this.primaryModel,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        model: this.primaryModel,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = AnthropicClient;