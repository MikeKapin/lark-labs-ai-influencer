const database = require('../database/connection');
const AnthropicClient = require('./anthropic-client');
const logger = require('../utils/logger');

/**
 * HVAC Knowledge Base Management System
 * Handles Canadian-focused HVAC knowledge with verification and categorization
 */
class HVACKnowledgeBase {
  constructor() {
    this.anthropic = new AnthropicClient();
    
    // Knowledge categories with Canadian specificity
    this.categories = {
      'refrigeration': {
        canadian_relevant: true,
        subcategories: ['superheat', 'subcooling', 'refrigerant_handling', 'recovery', 'charging']
      },
      'heating_systems': {
        canadian_relevant: true,
        subcategories: ['furnaces', 'heat_pumps', 'boilers', 'radiant', 'cold_climate_operation']
      },
      'codes_standards': {
        canadian_relevant: true,
        subcategories: ['csa_b52', 'provincial_codes', 'installation_standards', 'safety_requirements']
      },
      'electrical': {
        canadian_relevant: false,
        subcategories: ['wiring', 'controls', 'motors', 'troubleshooting', 'safety']
      },
      'ventilation': {
        canadian_relevant: true,
        subcategories: ['hrv_erv', 'air_quality', 'duct_design', 'exhaust_systems']
      },
      'tools_equipment': {
        canadian_relevant: false,
        subcategories: ['testing_instruments', 'installation_tools', 'safety_equipment', 'digital_tools']
      },
      'customer_service': {
        canadian_relevant: false,
        subcategories: ['communication', 'pricing', 'troubleshooting_approach', 'documentation']
      },
      'safety_procedures': {
        canadian_relevant: true,
        subcategories: ['lockout_tagout', 'chemical_safety', 'fall_protection', 'confined_space']
      }
    };

    // Canadian-specific topics that require special attention
    this.canadianFocusAreas = [
      'extreme_cold_operation',
      'csa_standards_compliance',
      'provincial_regulations',
      'metric_conversions',
      'canadian_climate_considerations',
      'winter_maintenance',
      'ice_damming_prevention',
      'energy_efficiency_canada'
    ];

    this.difficultyLevels = {
      1: 'Beginner - Basic concepts, new technicians',
      2: 'Intermediate - Some field experience required',
      3: 'Advanced - Experienced technicians',
      4: 'Expert - Specialized knowledge required',
      5: 'Master - Industry experts and specialists'
    };
  }

  /**
   * Add new knowledge entry with AI verification
   * @param {Object} knowledgeData - Knowledge entry data
   * @returns {Promise<Object>} - Created knowledge entry with verification
   */
  async addKnowledge(knowledgeData) {
    try {
      const {
        topic,
        category,
        content,
        source_type = 'manual',
        source_url = null,
        difficulty_level = 2,
        canadian_specific = false,
        safety_related = false
      } = knowledgeData;

      // Validate category
      if (!this.categories[category]) {
        throw new Error(`Invalid category: ${category}`);
      }

      // AI verification of content accuracy
      const verification = await this.verifyKnowledgeAccuracy(content, category, canadian_specific);

      // Determine subcategory if not provided
      const subcategory = knowledgeData.subcategory || 
        await this.determineSubcategory(topic, content, category);

      // Generate tags and keywords automatically
      const { tags, keywords } = await this.generateTagsAndKeywords(topic, content, category);

      // Create knowledge entry
      const knowledgeEntry = await database.create('hvac_knowledge', {
        topic,
        category,
        subcategory,
        content,
        canadian_specific: canadian_specific || this.categories[category].canadian_relevant,
        safety_related,
        difficulty_level,
        source_type,
        source_url,
        verified: verification.accuracy_score >= 85,
        verification_date: verification.accuracy_score >= 85 ? new Date() : null,
        tags,
        keywords
      });

      logger.info('HVAC knowledge entry created', {
        id: knowledgeEntry.id,
        topic,
        category,
        verified: knowledgeEntry.verified,
        accuracyScore: verification.accuracy_score
      });

      return {
        ...knowledgeEntry,
        verification_details: verification
      };

    } catch (error) {
      logger.error('Failed to add HVAC knowledge:', error);
      throw error;
    }
  }

  /**
   * Verify knowledge content accuracy using AI
   * @param {string} content - Content to verify
   * @param {string} category - Knowledge category
   * @param {boolean} canadianSpecific - Whether content is Canadian-specific
   * @returns {Promise<Object>} - Verification results
   */
  async verifyKnowledgeAccuracy(content, category, canadianSpecific) {
    const verificationPrompt = `
As an expert HVAC educator, verify the technical accuracy of this HVAC knowledge content:

CONTENT TO VERIFY:
${content}

CATEGORY: ${category}
CANADIAN SPECIFIC: ${canadianSpecific}

VERIFICATION CRITERIA:
1. Technical accuracy - Are the facts and procedures correct?
2. Safety compliance - Does it follow proper safety protocols?
3. Code compliance - Does it align with relevant codes/standards?
4. ${canadianSpecific ? 'Canadian relevance - Is it accurate for Canadian climate/codes?' : 'General applicability - Is it broadly applicable?'}
5. Clarity and completeness - Is the explanation clear and complete?
6. Current standards - Is the information up-to-date?

SCORING (0-100 for each criteria):
- Technical accuracy: Focus on factual correctness
- Safety compliance: HVAC safety best practices
- Code compliance: Industry standards alignment
- ${canadianSpecific ? 'Canadian relevance: CSA standards, climate considerations' : 'General applicability: Broad industry relevance'}
- Clarity: How well explained for target audience
- Currency: How current is the information

Return JSON only:
{
  "technical_accuracy": 95,
  "safety_compliance": 100,
  "code_compliance": 90,
  "${canadianSpecific ? 'canadian_relevance' : 'general_applicability'}": 88,
  "clarity": 92,
  "currency": 95,
  "accuracy_score": 93.3,
  "verification_notes": "Brief notes on accuracy assessment",
  "recommended_improvements": ["improvement 1", "improvement 2"],
  "safety_concerns": ["concern if any"],
  "verified": true
}
`;

    try {
      const response = await this.anthropic.generateContent(verificationPrompt, {
        maxTokens: 1000,
        temperature: 0.2 // Low temperature for factual verification
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const verification = JSON.parse(jsonMatch[0]);
        
        logger.debug('Knowledge verification completed', {
          accuracyScore: verification.accuracy_score,
          verified: verification.verified
        });

        return verification;
      } else {
        throw new Error('Failed to parse verification response');
      }

    } catch (error) {
      logger.warn('Knowledge verification failed, using manual review flag:', error.message);
      return {
        accuracy_score: 70,
        verified: false,
        verification_notes: 'AI verification failed, requires manual review',
        requires_manual_review: true
      };
    }
  }

  /**
   * Determine appropriate subcategory for knowledge entry
   * @param {string} topic - Knowledge topic
   * @param {string} content - Knowledge content
   * @param {string} category - Main category
   * @returns {Promise<string>} - Determined subcategory
   */
  async determineSubcategory(topic, content, category) {
    const subcategories = this.categories[category]?.subcategories || [];
    
    if (subcategories.length === 0) {
      return 'general';
    }

    const categorizationPrompt = `
Categorize this HVAC knowledge into the most appropriate subcategory:

TOPIC: ${topic}
CONTENT PREVIEW: ${content.substring(0, 300)}...
MAIN CATEGORY: ${category}

AVAILABLE SUBCATEGORIES: ${subcategories.join(', ')}

Return only the most appropriate subcategory name from the list above.
If none fit perfectly, choose the closest match.
`;

    try {
      const response = await this.anthropic.generateContent(categorizationPrompt, {
        maxTokens: 50,
        temperature: 0.1
      });

      const suggested = response.trim().toLowerCase().replace(/[^a-z_]/g, '');
      
      // Validate against available subcategories
      if (subcategories.includes(suggested)) {
        return suggested;
      }

      // Find closest match
      const closest = subcategories.find(sub => 
        sub.includes(suggested) || suggested.includes(sub)
      );

      return closest || subcategories[0];

    } catch (error) {
      logger.warn('Subcategory determination failed, using default:', error.message);
      return subcategories[0] || 'general';
    }
  }

  /**
   * Generate tags and keywords for knowledge entry
   * @param {string} topic - Knowledge topic
   * @param {string} content - Knowledge content
   * @param {string} category - Knowledge category
   * @returns {Promise<Object>} - Generated tags and keywords
   */
  async generateTagsAndKeywords(topic, content, category) {
    const tagPrompt = `
Generate relevant tags and keywords for this HVAC knowledge entry:

TOPIC: ${topic}
CATEGORY: ${category}
CONTENT: ${content.substring(0, 500)}...

Generate:
1. TAGS: 5-8 specific descriptive tags (e.g., "refrigerant-handling", "safety-procedure", "canadian-code")
2. KEYWORDS: 8-12 searchable keywords and phrases

Consider:
- Technical terms used
- Procedures described
- Equipment mentioned
- Safety aspects
- Canadian relevance if applicable
- Difficulty level indicators

Return JSON only:
{
  "tags": ["tag1", "tag2", "tag3"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
`;

    try {
      const response = await this.anthropic.generateContent(tagPrompt, {
        maxTokens: 500,
        temperature: 0.4
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Validate and clean tags/keywords
        const cleanTags = (result.tags || [])
          .map(tag => tag.toLowerCase().replace(/[^a-z0-9-_]/g, ''))
          .filter(tag => tag.length > 0)
          .slice(0, 8);

        const cleanKeywords = (result.keywords || [])
          .map(keyword => keyword.toLowerCase().trim())
          .filter(keyword => keyword.length > 0)
          .slice(0, 12);

        return {
          tags: cleanTags,
          keywords: cleanKeywords
        };
      }

    } catch (error) {
      logger.warn('Tag/keyword generation failed, using defaults:', error.message);
    }

    // Fallback default tags and keywords
    return {
      tags: [category, topic.toLowerCase().replace(/\s+/g, '-')],
      keywords: [topic, category, 'hvac']
    };
  }

  /**
   * Search knowledge base with advanced filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} - Search results
   */
  async searchKnowledge(searchParams) {
    const {
      query = '',
      category = null,
      subcategory = null,
      canadian_specific = null,
      safety_related = null,
      difficulty_level = null,
      verified_only = true,
      limit = 20
    } = searchParams;

    try {
      let sqlQuery = `
        SELECT 
          id, topic, category, subcategory, content, 
          canadian_specific, safety_related, difficulty_level,
          verified, tags, keywords, created_at
        FROM hvac_knowledge 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      // Add search conditions
      if (query.trim()) {
        paramCount++;
        sqlQuery += ` AND (
          topic ILIKE $${paramCount} 
          OR content ILIKE $${paramCount}
          OR $${paramCount} = ANY(keywords)
        )`;
        params.push(`%${query.trim()}%`);
      }

      if (category) {
        paramCount++;
        sqlQuery += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (subcategory) {
        paramCount++;
        sqlQuery += ` AND subcategory = $${paramCount}`;
        params.push(subcategory);
      }

      if (canadian_specific !== null) {
        paramCount++;
        sqlQuery += ` AND canadian_specific = $${paramCount}`;
        params.push(canadian_specific);
      }

      if (safety_related !== null) {
        paramCount++;
        sqlQuery += ` AND safety_related = $${paramCount}`;
        params.push(safety_related);
      }

      if (difficulty_level !== null) {
        paramCount++;
        sqlQuery += ` AND difficulty_level = $${paramCount}`;
        params.push(difficulty_level);
      }

      if (verified_only) {
        sqlQuery += ` AND verified = true`;
      }

      sqlQuery += ` ORDER BY 
        CASE WHEN topic ILIKE $1 THEN 1 ELSE 2 END,
        difficulty_level ASC,
        created_at DESC
        LIMIT ${parseInt(limit)}
      `;

      const results = await database.query(sqlQuery, params);

      // Enhance results with AI-powered relevance scoring if query provided
      if (query.trim()) {
        return await this.rankSearchResults(results.rows, query);
      }

      return results.rows;

    } catch (error) {
      logger.error('Knowledge search failed:', error);
      throw error;
    }
  }

  /**
   * Rank search results by relevance using AI
   * @param {Array} results - Search results
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Ranked results
   */
  async rankSearchResults(results, query) {
    if (results.length === 0) return results;

    try {
      const rankingPrompt = `
Rank these HVAC knowledge entries by relevance to the query: "${query}"

ENTRIES TO RANK:
${results.map((result, index) => `
${index + 1}. ${result.topic}
   Category: ${result.category}
   Preview: ${result.content.substring(0, 150)}...
`).join('\n')}

Return JSON array with entry numbers in order of relevance (most relevant first):
["2", "1", "4", "3", ...]

Consider:
- Direct topic match
- Content relevance
- Practical applicability
- Safety importance if query relates to safety
`;

      const response = await this.anthropic.generateContent(rankingPrompt, {
        maxTokens: 200,
        temperature: 0.2
      });

      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const ranking = JSON.parse(jsonMatch[0]);
        
        // Reorder results based on AI ranking
        const rankedResults = ranking
          .map(index => results[parseInt(index) - 1])
          .filter(result => result); // Remove undefined entries

        // Add any missing entries at the end
        const usedIndices = ranking.map(i => parseInt(i) - 1);
        const missedResults = results.filter((_, index) => !usedIndices.includes(index));
        
        return [...rankedResults, ...missedResults];
      }

    } catch (error) {
      logger.warn('Result ranking failed, returning original order:', error.message);
    }

    return results;
  }

  /**
   * Get knowledge suggestions for content creation
   * @param {string} topic - Content topic
   * @param {string} contentType - Content type
   * @param {number} difficultyLevel - Target difficulty level
   * @returns {Promise<Array>} - Relevant knowledge entries
   */
  async getKnowledgeForContent(topic, contentType, difficultyLevel = 3) {
    try {
      // Search for directly relevant knowledge
      const directResults = await this.searchKnowledge({
        query: topic,
        difficulty_level: difficultyLevel,
        verified_only: true,
        limit: 10
      });

      // Search for related safety information if not safety content
      let safetyResults = [];
      if (contentType !== 'safety') {
        safetyResults = await this.searchKnowledge({
          query: topic,
          safety_related: true,
          verified_only: true,
          limit: 5
        });
      }

      // Get Canadian-specific information
      const canadianResults = await this.searchKnowledge({
        query: topic,
        canadian_specific: true,
        verified_only: true,
        limit: 5
      });

      // Combine and deduplicate results
      const allResults = [...directResults, ...safetyResults, ...canadianResults];
      const uniqueResults = allResults.filter((result, index, self) => 
        self.findIndex(r => r.id === result.id) === index
      );

      // Add relevance scoring and categorization
      const categorizedKnowledge = {
        primary: uniqueResults.slice(0, 5),
        safety: safetyResults.slice(0, 3),
        canadian_specific: canadianResults.slice(0, 3),
        supplementary: uniqueResults.slice(5, 10)
      };

      logger.debug('Knowledge retrieved for content creation', {
        topic,
        contentType,
        totalEntries: uniqueResults.length,
        primaryCount: categorizedKnowledge.primary.length
      });

      return categorizedKnowledge;

    } catch (error) {
      logger.error('Failed to get knowledge for content:', error);
      throw error;
    }
  }

  /**
   * Update knowledge entry verification status
   * @param {string} knowledgeId - Knowledge entry ID
   * @param {Object} verificationData - Verification update data
   * @returns {Promise<Object>} - Updated knowledge entry
   */
  async updateVerification(knowledgeId, verificationData) {
    try {
      const updates = {
        verified: verificationData.verified,
        verification_date: verificationData.verified ? new Date() : null
      };

      const updatedEntry = await database.update('hvac_knowledge', knowledgeId, updates);

      logger.info('Knowledge verification updated', {
        id: knowledgeId,
        verified: verificationData.verified
      });

      return updatedEntry;

    } catch (error) {
      logger.error('Failed to update knowledge verification:', error);
      throw error;
    }
  }

  /**
   * Get knowledge base statistics
   * @returns {Promise<Object>} - Knowledge base statistics
   */
  async getKnowledgeStats() {
    try {
      const stats = await database.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_entries,
          COUNT(CASE WHEN canadian_specific = true THEN 1 END) as canadian_entries,
          COUNT(CASE WHEN safety_related = true THEN 1 END) as safety_entries,
          COUNT(CASE WHEN difficulty_level = 1 THEN 1 END) as beginner_entries,
          COUNT(CASE WHEN difficulty_level = 2 THEN 1 END) as intermediate_entries,
          COUNT(CASE WHEN difficulty_level = 3 THEN 1 END) as advanced_entries,
          COUNT(CASE WHEN difficulty_level >= 4 THEN 1 END) as expert_entries
        FROM hvac_knowledge
      `);

      const categoryStats = await database.query(`
        SELECT category, COUNT(*) as count 
        FROM hvac_knowledge 
        GROUP BY category 
        ORDER BY count DESC
      `);

      return {
        overview: stats.rows[0],
        by_category: categoryStats.rows.reduce((acc, row) => {
          acc[row.category] = parseInt(row.count);
          return acc;
        }, {}),
        categories_available: Object.keys(this.categories),
        canadian_focus_areas: this.canadianFocusAreas
      };

    } catch (error) {
      logger.error('Failed to get knowledge base statistics:', error);
      throw error;
    }
  }

  /**
   * Bulk import knowledge entries from structured data
   * @param {Array} knowledgeEntries - Array of knowledge entries to import
   * @returns {Promise<Object>} - Import results
   */
  async bulkImport(knowledgeEntries) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const entry of knowledgeEntries) {
      try {
        await this.addKnowledge(entry);
        results.successful++;
        
        // Small delay to avoid overwhelming the AI verification system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.failed++;
        results.errors.push({
          entry: entry.topic || 'Unknown topic',
          error: error.message
        });
        logger.warn(`Failed to import knowledge entry: ${entry.topic}`, error.message);
      }
    }

    logger.info('Bulk knowledge import completed', {
      total: knowledgeEntries.length,
      successful: results.successful,
      failed: results.failed
    });

    return results;
  }
}

module.exports = HVACKnowledgeBase;