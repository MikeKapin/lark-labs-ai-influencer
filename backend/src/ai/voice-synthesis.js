const ElevenLabs = require('@elevenlabs/elevenlabs-js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Voice Synthesis Engine for Alex Reid Character
 * Handles voice generation using ElevenLabs API with consistency tracking
 */
class VoiceSynthesis {
  constructor() {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }

    // Initialize ElevenLabs client with v2 API
    this.client = ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    // Alex Reid voice configuration
    this.alexReidVoice = {
      voice_id: process.env.CHARACTER_VOICE_ID || 'default',
      stability: parseFloat(process.env.VOICE_STABILITY) || 0.85,
      similarity_boost: parseFloat(process.env.VOICE_SIMILARITY) || 0.90,
      style: 0.15, // Slightly more expressive for educational content
      use_speaker_boost: true
    };

    // Voice quality thresholds
    this.qualityThresholds = {
      consistency: 90, // Minimum voice consistency score
      clarity: 85,     // Minimum clarity score
      naturalness: 88  // Minimum naturalness score
    };

    // Audio output settings
    this.audioSettings = {
      output_format: 'mp3_44100_128',
      sample_rate: 44100,
      bitrate: 128
    };

    logger.info('Voice synthesis engine initialized', {
      voiceId: this.alexReidVoice.voice_id,
      stability: this.alexReidVoice.stability
    });
  }

  /**
   * Generate speech from text for Alex Reid character
   * @param {string} text - Text to convert to speech
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Audio file path and metadata
   */
  async generateSpeech(text, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text content is required for speech generation');
      }

      if (text.length > 5000) {
        throw new Error('Text too long for single speech generation (max 5000 characters)');
      }

      // Prepare voice settings
      const voiceSettings = {
        stability: options.stability || this.alexReidVoice.stability,
        similarity_boost: options.similarity_boost || this.alexReidVoice.similarity_boost,
        style: options.style || this.alexReidVoice.style,
        use_speaker_boost: options.use_speaker_boost !== undefined ? options.use_speaker_boost : this.alexReidVoice.use_speaker_boost
      };

      logger.characterEngine('Starting speech generation', {
        textLength: text.length,
        voiceId: this.alexReidVoice.voice_id,
        settings: voiceSettings
      });

      // Generate speech using ElevenLabs
      const audio = await this.client.generate({
        voice: this.alexReidVoice.voice_id,
        text: text,
        model_id: options.model_id || 'eleven_multilingual_v2',
        voice_settings: voiceSettings,
        output_format: this.audioSettings.output_format
      });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `alex_reid_${timestamp}.mp3`;
      const audioDir = path.join(__dirname, '../../storage/audio');
      const audioPath = path.join(audioDir, filename);

      // Ensure directory exists
      await fs.mkdir(audioDir, { recursive: true });

      // Save audio file
      const audioBuffer = Buffer.from(await audio.arrayBuffer());
      await fs.writeFile(audioPath, audioBuffer);

      // Calculate metrics
      const duration = Date.now() - startTime;
      const audioSize = audioBuffer.length;
      const estimatedDuration = this.estimateAudioDuration(text);

      // Quality assessment
      const qualityScore = await this.assessAudioQuality(audioBuffer, text);

      const result = {
        audio_path: audioPath,
        filename: filename,
        file_size: audioSize,
        estimated_duration: estimatedDuration,
        generation_time: duration,
        voice_settings: voiceSettings,
        quality_score: qualityScore,
        text_length: text.length,
        meets_quality_threshold: qualityScore.overall >= this.qualityThresholds.consistency,
        created_at: new Date().toISOString()
      };

      logger.characterEngine('Speech generation completed', {
        filename,
        duration: `${duration}ms`,
        audioSize: `${Math.round(audioSize / 1024)}KB`,
        qualityScore: qualityScore.overall,
        meetsThreshold: result.meets_quality_threshold
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Speech generation failed:', {
        textLength: text.length,
        duration: `${duration}ms`,
        error: error.message
      });
      throw new Error(`Voice synthesis failed: ${error.message}`);
    }
  }

  /**
   * Generate speech for video script with timestamps
   * @param {string} script - Video script with timestamps
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} - Array of audio segments with timing
   */
  async generateScriptAudio(script, options = {}) {
    try {
      // Parse script into segments based on timestamps
      const segments = this.parseScriptSegments(script);
      const audioSegments = [];

      logger.contentCreation('Generating audio for script segments', {
        segmentCount: segments.length
      });

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // Generate audio for this segment
        const audioResult = await this.generateSpeech(segment.text, {
          ...options,
          segment_index: i
        });

        audioSegments.push({
          ...audioResult,
          start_time: segment.start_time,
          end_time: segment.end_time,
          segment_index: i,
          text: segment.text
        });

        // Small delay between segments to avoid rate limiting
        if (i < segments.length - 1) {
          await this.delay(500);
        }
      }

      // Generate combined audio file if requested
      if (options.combine_segments) {
        const combinedAudio = await this.combineAudioSegments(audioSegments);
        audioSegments.push({
          type: 'combined',
          ...combinedAudio
        });
      }

      logger.contentCreation('Script audio generation completed', {
        segmentCount: audioSegments.length,
        totalDuration: audioSegments.reduce((sum, seg) => sum + (seg.estimated_duration || 0), 0)
      });

      return audioSegments;

    } catch (error) {
      logger.error('Script audio generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse script into segments based on timestamps
   * @param {string} script - Script text with timestamps
   * @returns {Array} - Array of script segments
   */
  parseScriptSegments(script) {
    const segments = [];
    const lines = script.split('\n');
    let currentSegment = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for timestamp patterns like (0:30-1:15) or [2:00]
      const timestampMatch = trimmed.match(/[\(\[](\d+:\d+)(?:-(\d+:\d+))?[\)\]]/);
      
      if (timestampMatch) {
        // Save previous segment if exists
        if (currentSegment && currentSegment.text.trim()) {
          segments.push(currentSegment);
        }

        // Start new segment
        currentSegment = {
          start_time: timestampMatch[1],
          end_time: timestampMatch[2] || null,
          text: trimmed.replace(timestampMatch[0], '').trim()
        };
      } else if (currentSegment && trimmed) {
        // Add to current segment
        currentSegment.text += ' ' + trimmed;
      } else if (trimmed && !currentSegment) {
        // Create segment without timestamp
        currentSegment = {
          start_time: null,
          end_time: null,
          text: trimmed
        };
      }
    }

    // Add final segment
    if (currentSegment && currentSegment.text.trim()) {
      segments.push(currentSegment);
    }

    return segments.filter(seg => seg.text && seg.text.trim().length > 0);
  }

  /**
   * Assess audio quality based on various factors
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {string} text - Original text
   * @returns {Promise<Object>} - Quality assessment scores
   */
  async assessAudioQuality(audioBuffer, text) {
    try {
      // Basic quality metrics based on audio characteristics
      const fileSize = audioBuffer.length;
      const textLength = text.length;
      const expectedSize = textLength * 150; // Rough estimate: 150 bytes per character for quality audio

      // Quality factors
      const sizeRatio = Math.min(fileSize / expectedSize, 2); // Cap at 2x expected size
      const sizeFactor = sizeRatio > 0.5 ? Math.min(sizeRatio, 1.5) : 0.5; // Penalize very small files

      // Text complexity factors
      const wordCount = text.split(/\s+/).length;
      const avgWordsPerSentence = wordCount / (text.split(/[.!?]+/).length - 1 || 1);
      const complexityFactor = avgWordsPerSentence > 20 ? 0.9 : 1.0; // Slight penalty for very long sentences

      // Character consistency (placeholder - would need actual voice analysis)
      const characterConsistency = 88; // This would be calculated by comparing against reference Alex Reid voice

      const scores = {
        consistency: Math.round(characterConsistency * complexityFactor),
        clarity: Math.round(85 * sizeFactor),
        naturalness: Math.round(87 * complexityFactor * sizeFactor),
        overall: 0
      };

      // Calculate overall score
      scores.overall = Math.round(
        (scores.consistency * 0.4) +
        (scores.clarity * 0.3) +
        (scores.naturalness * 0.3)
      );

      return scores;

    } catch (error) {
      logger.warn('Audio quality assessment failed, using default scores:', error.message);
      return {
        consistency: 80,
        clarity: 80,
        naturalness: 80,
        overall: 80
      };
    }
  }

  /**
   * Combine multiple audio segments into one file
   * @param {Array} audioSegments - Array of audio segment objects
   * @returns {Promise<Object>} - Combined audio file information
   */
  async combineAudioSegments(audioSegments) {
    // This would require additional audio processing libraries like FFmpeg
    // For now, return a placeholder that would be implemented with proper audio tools
    const totalDuration = audioSegments.reduce((sum, seg) => sum + (seg.estimated_duration || 0), 0);
    
    return {
      audio_path: '/placeholder/combined-audio.mp3',
      filename: 'combined_alex_reid_script.mp3',
      estimated_duration: totalDuration,
      segment_count: audioSegments.length,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Estimate audio duration based on text length and reading speed
   * @param {string} text - Text content
   * @returns {number} - Estimated duration in seconds
   */
  estimateAudioDuration(text) {
    const wordsPerMinute = 180; // Alex Reid's comfortable speaking pace
    const words = text.split(/\s+/).length;
    const minutes = words / wordsPerMinute;
    return Math.round(minutes * 60);
  }

  /**
   * Get available voices from ElevenLabs
   * @returns {Promise<Array>} - Available voices
   */
  async getAvailableVoices() {
    try {
      const voices = await this.client.voices.getAll();
      return voices.voices.map(voice => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        labels: voice.labels
      }));
    } catch (error) {
      logger.error('Failed to fetch available voices:', error.message);
      throw error;
    }
  }

  /**
   * Test voice synthesis with sample text
   * @param {string} voiceId - Voice ID to test
   * @returns {Promise<Object>} - Test results
   */
  async testVoice(voiceId = null) {
    const testText = "Hey HVAC family, Alex here from LARK Labs. This is a test of the voice synthesis system. Safety first, solutions second, success follows.";
    
    const originalVoiceId = this.alexReidVoice.voice_id;
    
    try {
      if (voiceId) {
        this.alexReidVoice.voice_id = voiceId;
      }

      const result = await this.generateSpeech(testText, {
        test_mode: true
      });

      return {
        success: true,
        voice_id: this.alexReidVoice.voice_id,
        test_text: testText,
        result
      };

    } catch (error) {
      return {
        success: false,
        voice_id: this.alexReidVoice.voice_id,
        error: error.message
      };
    } finally {
      // Restore original voice ID
      this.alexReidVoice.voice_id = originalVoiceId;
    }
  }

  /**
   * Update voice settings for Alex Reid character
   * @param {Object} settings - New voice settings
   */
  updateVoiceSettings(settings) {
    const allowedSettings = ['stability', 'similarity_boost', 'style', 'use_speaker_boost'];
    
    for (const [key, value] of Object.entries(settings)) {
      if (allowedSettings.includes(key)) {
        this.alexReidVoice[key] = value;
      }
    }

    logger.characterEngine('Voice settings updated', {
      settings: Object.keys(settings).filter(key => allowedSettings.includes(key))
    });
  }

  /**
   * Health check for voice synthesis system
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Test with short sample
      const testResult = await this.testVoice();
      const latency = Date.now() - startTime;

      return {
        healthy: testResult.success,
        latency,
        voice_id: this.alexReidVoice.voice_id,
        error: testResult.success ? null : testResult.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old audio files
   * @param {number} daysOld - Remove files older than this many days
   */
  async cleanupOldAudio(daysOld = 7) {
    try {
      const audioDir = path.join(__dirname, '../../storage/audio');
      const files = await fs.readdir(audioDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      let removedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const filePath = path.join(audioDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            removedCount++;
          }
        }
      }

      logger.info(`Cleaned up ${removedCount} old audio files older than ${daysOld} days`);
      return removedCount;

    } catch (error) {
      logger.error('Audio cleanup failed:', error.message);
      return 0;
    }
  }
}

module.exports = VoiceSynthesis;