const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const database = require('../database/connection');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Video Generation Pipeline for Alex Reid Educational Content
 * Creates professional HVAC educational videos with consistent branding
 */
class VideoGenerator {
  constructor() {
    this.videoSettings = {
      resolution: '1920x1080',
      framerate: 30,
      bitrate: '5000k',
      audioSampleRate: 44100,
      audioBitrate: '128k'
    };

    this.brandingElements = {
      logoPath: path.join(__dirname, 'assets', 'lark-labs-logo.png'),
      colorScheme: {
        primary: '#1E3A8A', // Navy blue
        secondary: '#F97316', // Orange
        background: '#F8FAFC', // Light gray
        text: '#1F2937' // Dark gray
      },
      fonts: {
        primary: 'Arial',
        secondary: 'Helvetica'
      }
    };

    this.templateSettings = {
      intro_duration: 5, // seconds
      outro_duration: 8, // seconds
      transition_duration: 1, // seconds
      logo_display_duration: 3 // seconds
    };

    // Ensure directories exist
    this.initializeDirectories();

    logger.info('Video generator initialized', {
      resolution: this.videoSettings.resolution,
      framerate: this.videoSettings.framerate
    });
  }

  /**
   * Initialize required directories
   */
  async initializeDirectories() {
    const dirs = [
      path.join(__dirname, '../storage/videos'),
      path.join(__dirname, '../storage/temp'),
      path.join(__dirname, 'assets'),
      path.join(__dirname, 'assets/backgrounds'),
      path.join(__dirname, 'assets/overlays')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          logger.warn(`Failed to create directory ${dir}:`, error.message);
        }
      }
    }
  }

  /**
   * Generate complete video from content data
   * @param {Object} contentData - Content information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated video information
   */
  async generateVideo(contentData, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        generateThumbnail = true,
        includeSubtitles = false,
        quality = 'high'
      } = options;

      logger.contentCreation('Starting video generation', {
        contentId: contentData.id,
        topic: contentData.topic,
        duration: contentData.duration_seconds
      });

      // Step 1: Create video assets
      const assets = await this.createVideoAssets(contentData);

      // Step 2: Generate background video
      const backgroundVideo = await this.createBackgroundVideo(contentData, assets);

      // Step 3: Add audio (voice-over)
      const videoWithAudio = await this.addAudioTrack(backgroundVideo, contentData, assets);

      // Step 4: Add branding elements (logo, watermarks)
      const brandedVideo = await this.addBrandingElements(videoWithAudio, assets);

      // Step 5: Add text overlays and transitions
      const finalVideo = await this.addTextOverlays(brandedVideo, contentData, assets);

      // Step 6: Generate thumbnail
      let thumbnail = null;
      if (generateThumbnail) {
        thumbnail = await this.generateThumbnail(contentData, assets);
      }

      // Step 7: Generate subtitles/captions (if requested)
      let subtitles = null;
      if (includeSubtitles) {
        subtitles = await this.generateSubtitles(contentData);
      }

      // Step 8: Cleanup temporary files
      await this.cleanupTempFiles(assets.tempFiles || []);

      const totalTime = Date.now() - startTime;

      const videoResult = {
        video_path: finalVideo.path,
        filename: finalVideo.filename,
        thumbnail_path: thumbnail?.path || null,
        thumbnail_filename: thumbnail?.filename || null,
        duration_seconds: contentData.duration_seconds,
        file_size: finalVideo.size,
        resolution: this.videoSettings.resolution,
        generation_time: totalTime,
        quality_settings: {
          bitrate: this.videoSettings.bitrate,
          framerate: this.videoSettings.framerate,
          audio_quality: this.videoSettings.audioBitrate
        },
        subtitles: subtitles,
        created_at: new Date().toISOString()
      };

      logger.contentCreation('Video generation completed', {
        contentId: contentData.id,
        filename: finalVideo.filename,
        duration: `${totalTime}ms`,
        fileSize: `${Math.round(finalVideo.size / 1024 / 1024)}MB`
      });

      return videoResult;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('Video generation failed:', {
        contentId: contentData.id,
        error: error.message,
        duration: `${totalTime}ms`
      });
      throw error;
    }
  }

  /**
   * Create video assets (backgrounds, text slides, etc.)
   * @param {Object} contentData - Content data
   * @returns {Promise<Object>} - Created assets
   */
  async createVideoAssets(contentData) {
    try {
      const assets = {
        backgrounds: [],
        textSlides: [],
        overlays: [],
        tempFiles: []
      };

      // Create Alex Reid workspace background
      const workspaceBackground = await this.createWorkspaceBackground();
      assets.backgrounds.push(workspaceBackground);
      assets.tempFiles.push(workspaceBackground);

      // Create title slide
      const titleSlide = await this.createTitleSlide(contentData);
      assets.textSlides.push(titleSlide);
      assets.tempFiles.push(titleSlide);

      // Create key points slides (extract from script)
      const keyPoints = this.extractKeyPoints(contentData.script);
      for (let i = 0; i < Math.min(keyPoints.length, 5); i++) {
        const pointSlide = await this.createKeyPointSlide(keyPoints[i], i + 1);
        assets.textSlides.push(pointSlide);
        assets.tempFiles.push(pointSlide);
      }

      // Create safety warning overlay if content is safety-related
      if (contentData.safety_related) {
        const safetyOverlay = await this.createSafetyOverlay();
        assets.overlays.push(safetyOverlay);
        assets.tempFiles.push(safetyOverlay);
      }

      // Create LARK Labs branding elements
      const brandingOverlay = await this.createBrandingOverlay();
      assets.overlays.push(brandingOverlay);
      assets.tempFiles.push(brandingOverlay);

      return assets;

    } catch (error) {
      logger.error('Failed to create video assets:', error);
      throw error;
    }
  }

  /**
   * Create professional HVAC workspace background
   */
  async createWorkspaceBackground() {
    const backgroundPath = path.join(__dirname, '../storage/temp', `background_${Date.now()}.png`);
    
    try {
      // Create a professional workspace background using Sharp
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: this.brandingElements.colorScheme.background
        }
      })
      .composite([
        // Add workshop setting elements
        {
          input: Buffer.from(`
            <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="workshopGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#F8FAFC;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#E2E8F0;stop-opacity:1" />
                </linearGradient>
              </defs>
              <rect width="1920" height="1080" fill="url(#workshopGradient)" />
              
              <!-- Workshop bench outline -->
              <rect x="100" y="800" width="1720" height="200" fill="${this.brandingElements.colorScheme.primary}" opacity="0.1" />
              
              <!-- Equipment silhouettes -->
              <rect x="1400" y="300" width="300" height="400" rx="10" fill="${this.brandingElements.colorScheme.primary}" opacity="0.15" />
              <rect x="200" y="400" width="200" height="300" rx="10" fill="${this.brandingElements.colorScheme.secondary}" opacity="0.1" />
              
              <!-- Professional lighting effect -->
              <ellipse cx="960" cy="200" rx="800" ry="300" fill="white" opacity="0.3" />
              
              <!-- Subtle grid pattern -->
              <defs>
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="${this.brandingElements.colorScheme.primary}" stroke-width="0.5" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="1920" height="1080" fill="url(#grid)" />
            </svg>
          `),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toFile(backgroundPath);

      return backgroundPath;

    } catch (error) {
      logger.warn('Failed to create custom background, using solid color');
      
      // Fallback: create simple solid background
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: this.brandingElements.colorScheme.background
        }
      }).png().toFile(backgroundPath);

      return backgroundPath;
    }
  }

  /**
   * Create title slide with Alex Reid branding
   */
  async createTitleSlide(contentData) {
    const titlePath = path.join(__dirname, '../storage/temp', `title_${Date.now()}.png`);

    try {
      const titleText = contentData.title || contentData.topic;
      const subtitle = `with Alex Reid • LARK Labs HVAC Education`;

      const svgTitle = `
        <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
          <rect width="1920" height="1080" fill="${this.brandingElements.colorScheme.primary}" />
          
          <!-- Main title -->
          <text x="960" y="450" font-family="Arial, sans-serif" font-size="72" font-weight="bold" 
                text-anchor="middle" fill="white">
            ${this.wrapText(titleText, 30)}
          </text>
          
          <!-- Subtitle -->
          <text x="960" y="550" font-family="Arial, sans-serif" font-size="36" 
                text-anchor="middle" fill="${this.brandingElements.colorScheme.secondary}">
            ${subtitle}
          </text>
          
          <!-- Decorative elements -->
          <rect x="760" y="600" width="400" height="4" fill="${this.brandingElements.colorScheme.secondary}" />
          
          <!-- Safety badge if applicable -->
          ${contentData.safety_related ? `
            <g transform="translate(1400, 200)">
              <circle cx="0" cy="0" r="80" fill="${this.brandingElements.colorScheme.secondary}" />
              <text x="0" y="-10" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
                    text-anchor="middle" fill="white">SAFETY</text>
              <text x="0" y="15" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
                    text-anchor="middle" fill="white">FOCUS</text>
            </g>
          ` : ''}
          
          <!-- Canadian flag or maple leaf if Canadian content -->
          ${contentData.canadian_specific ? `
            <g transform="translate(500, 200)">
              <rect x="-30" y="-20" width="60" height="40" fill="#FF0000" />
              <rect x="-10" y="-20" width="20" height="40" fill="white" />
              <text x="0" y="5" font-family="Arial, sans-serif" font-size="24" 
                    text-anchor="middle" fill="#FF0000">🍁</text>
            </g>
          ` : ''}
        </svg>
      `;

      await sharp(Buffer.from(svgTitle))
        .png()
        .toFile(titlePath);

      return titlePath;

    } catch (error) {
      logger.error('Failed to create title slide:', error);
      throw error;
    }
  }

  /**
   * Extract key points from script for visual slides
   */
  extractKeyPoints(script) {
    const keyPoints = [];
    const lines = script.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for numbered points, bullet points, or key sections
      if (
        trimmed.match(/^\d+\./) ||
        trimmed.includes('Key point:') ||
        trimmed.includes('Important:') ||
        trimmed.includes('Remember:') ||
        trimmed.includes('SAFETY:')
      ) {
        keyPoints.push(trimmed);
      }
    }

    // If no structured points found, extract first sentence of each paragraph
    if (keyPoints.length === 0) {
      const paragraphs = script.split('\n\n');
      for (const paragraph of paragraphs.slice(0, 5)) {
        const firstSentence = paragraph.split('.')[0] + '.';
        if (firstSentence.length > 20 && firstSentence.length < 150) {
          keyPoints.push(firstSentence);
        }
      }
    }

    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  /**
   * Create key point slide
   */
  async createKeyPointSlide(pointText, pointNumber) {
    const slidePath = path.join(__dirname, '../storage/temp', `point_${pointNumber}_${Date.now()}.png`);

    try {
      const cleanText = pointText.replace(/^\d+\./, '').replace(/^(Key point:|Important:|Remember:|SAFETY:)/i, '').trim();
      const wrappedText = this.wrapText(cleanText, 50);

      const svgSlide = `
        <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
          <rect width="1920" height="1080" fill="${this.brandingElements.colorScheme.background}" />
          
          <!-- Point number circle -->
          <circle cx="300" cy="300" r="60" fill="${this.brandingElements.colorScheme.primary}" />
          <text x="300" y="315" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
                text-anchor="middle" fill="white">${pointNumber}</text>
          
          <!-- Point text -->
          <text x="450" y="280" font-family="Arial, sans-serif" font-size="42" font-weight="600" 
                fill="${this.brandingElements.colorScheme.text}">
            ${wrappedText}
          </text>
          
          <!-- LARK Labs logo area -->
          <rect x="1500" y="50" width="300" height="100" fill="${this.brandingElements.colorScheme.primary}" opacity="0.1" rx="10" />
          <text x="1650" y="105" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
                text-anchor="middle" fill="${this.brandingElements.colorScheme.primary}">LARK Labs</text>
          
          <!-- Decorative elements -->
          <rect x="450" y="350" width="800" height="2" fill="${this.brandingElements.colorScheme.secondary}" />
        </svg>
      `;

      await sharp(Buffer.from(svgSlide))
        .png()
        .toFile(slidePath);

      return slidePath;

    } catch (error) {
      logger.error(`Failed to create key point slide ${pointNumber}:`, error);
      throw error;
    }
  }

  /**
   * Create safety warning overlay
   */
  async createSafetyOverlay() {
    const overlayPath = path.join(__dirname, '../storage/temp', `safety_overlay_${Date.now()}.png`);

    try {
      const svgOverlay = `
        <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
          <!-- Transparent background -->
          <rect width="1920" height="1080" fill="transparent" />
          
          <!-- Safety warning banner -->
          <g transform="translate(960, 100)">
            <rect x="-400" y="-40" width="800" height="80" fill="#DC2626" rx="10" />
            <text x="0" y="-5" font-family="Arial, sans-serif" font-size="28" font-weight="bold" 
                  text-anchor="middle" fill="white">⚠️ SAFETY FIRST ⚠️</text>
            <text x="0" y="25" font-family="Arial, sans-serif" font-size="18" 
                  text-anchor="middle" fill="white">Always follow proper safety procedures</text>
          </g>
        </svg>
      `;

      await sharp(Buffer.from(svgOverlay))
        .png()
        .toFile(overlayPath);

      return overlayPath;

    } catch (error) {
      logger.error('Failed to create safety overlay:', error);
      throw error;
    }
  }

  /**
   * Create LARK Labs branding overlay
   */
  async createBrandingOverlay() {
    const overlayPath = path.join(__dirname, '../storage/temp', `branding_overlay_${Date.now()}.png`);

    try {
      const svgOverlay = `
        <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
          <!-- Transparent background -->
          <rect width="1920" height="1080" fill="transparent" />
          
          <!-- LARK Labs logo/watermark (bottom right) -->
          <g transform="translate(1600, 950)">
            <rect x="-150" y="-40" width="300" height="80" fill="${this.brandingElements.colorScheme.primary}" rx="5" opacity="0.9" />
            <text x="0" y="-5" font-family="Arial, sans-serif" font-size="28" font-weight="bold" 
                  text-anchor="middle" fill="white">LARK Labs</text>
            <text x="0" y="20" font-family="Arial, sans-serif" font-size="16" 
                  text-anchor="middle" fill="${this.brandingElements.colorScheme.secondary}">HVAC Education</text>
          </g>
          
          <!-- Website URL (bottom left) -->
          <g transform="translate(200, 950)">
            <text x="0" y="0" font-family="Arial, sans-serif" font-size="20" 
                  fill="${this.brandingElements.colorScheme.text}">larklabs.org</text>
          </g>
        </svg>
      `;

      await sharp(Buffer.from(svgOverlay))
        .png()
        .toFile(overlayPath);

      return overlayPath;

    } catch (error) {
      logger.error('Failed to create branding overlay:', error);
      throw error;
    }
  }

  /**
   * Create background video with slides and transitions
   */
  async createBackgroundVideo(contentData, assets) {
    const outputPath = path.join(__dirname, '../storage/temp', `background_${Date.now()}.mp4`);

    try {
      return new Promise((resolve, reject) => {
        let command = ffmpeg();

        // Add background image as base video
        command = command.input(assets.backgrounds[0])
          .inputOptions(['-loop 1', '-t', contentData.duration_seconds]);

        // Add text slides as overlays with timing
        const slideDuration = Math.floor(contentData.duration_seconds / assets.textSlides.length);
        
        assets.textSlides.forEach((slide, index) => {
          const startTime = index * slideDuration;
          const endTime = (index + 1) * slideDuration;
          
          command = command.input(slide)
            .inputOptions(['-loop 1', `-t ${slideDuration}`]);
        });

        // Configure video output
        command
          .complexFilter([
            // Create base video from background
            '[0:v]scale=1920:1080[bg]',
            
            // Overlay text slides with fade transitions
            ...assets.textSlides.map((_, index) => {
              const inputIndex = index + 1;
              const startTime = index * slideDuration;
              const fadeIn = Math.min(1, slideDuration * 0.1);
              const fadeOut = Math.min(1, slideDuration * 0.1);
              
              return `[${inputIndex}:v]scale=1920:1080,fade=in:st=0:d=${fadeIn}:alpha=1,fade=out:st=${slideDuration - fadeOut}:d=${fadeOut}:alpha=1[slide${index}]`;
            }),
            
            // Combine all overlays
            `[bg]${assets.textSlides.map((_, index) => `[slide${index}]overlay=0:0:enable='between(t,${index * slideDuration},${(index + 1) * slideDuration})'`).join('')}[final]`
          ])
          .map('[final]')
          .videoCodec('libx264')
          .videoBitrate(this.videoSettings.bitrate)
          .fps(this.videoSettings.framerate)
          .format('mp4')
          .output(outputPath)
          .on('end', () => {
            resolve({
              path: outputPath,
              filename: path.basename(outputPath)
            });
          })
          .on('error', reject)
          .run();
      });

    } catch (error) {
      logger.error('Failed to create background video:', error);
      throw error;
    }
  }

  /**
   * Add audio track to video
   */
  async addAudioTrack(backgroundVideo, contentData, assets) {
    const outputPath = path.join(__dirname, '../storage/temp', `with_audio_${Date.now()}.mp4`);

    try {
      // Check if audio file exists
      const audioPath = contentData.audio_path;
      if (!audioPath) {
        logger.warn('No audio path provided, creating silent video');
        return backgroundVideo; // Return video without audio
      }

      try {
        await fs.access(audioPath);
      } catch (error) {
        logger.warn('Audio file not found, creating silent video:', audioPath);
        return backgroundVideo;
      }

      return new Promise((resolve, reject) => {
        ffmpeg(backgroundVideo.path)
          .input(audioPath)
          .videoCodec('copy') // Don't re-encode video
          .audioCodec('aac')
          .audioBitrate(this.videoSettings.audioBitrate)
          .audioFrequency(this.videoSettings.audioSampleRate)
          .output(outputPath)
          .on('end', () => {
            resolve({
              path: outputPath,
              filename: path.basename(outputPath)
            });
          })
          .on('error', reject)
          .run();
      });

    } catch (error) {
      logger.error('Failed to add audio track:', error);
      throw error;
    }
  }

  /**
   * Add branding elements to video
   */
  async addBrandingElements(video, assets) {
    const outputPath = path.join(__dirname, '../storage/temp', `branded_${Date.now()}.mp4`);

    try {
      return new Promise((resolve, reject) => {
        let command = ffmpeg(video.path);

        // Add branding overlay
        if (assets.overlays.length > 0) {
          command = command.input(assets.overlays[assets.overlays.length - 1]); // Use branding overlay
          
          command = command
            .complexFilter(['[0:v][1:v]overlay=0:0[branded]'])
            .map('[branded]');
        }

        command
          .videoCodec('libx264')
          .videoBitrate(this.videoSettings.bitrate)
          .audioCodec('copy') // Preserve audio
          .format('mp4')
          .output(outputPath)
          .on('end', () => {
            resolve({
              path: outputPath,
              filename: path.basename(outputPath)
            });
          })
          .on('error', reject)
          .run();
      });

    } catch (error) {
      logger.error('Failed to add branding elements:', error);
      throw error;
    }
  }

  /**
   * Add text overlays and final touches
   */
  async addTextOverlays(video, contentData, assets) {
    const timestamp = Date.now();
    const finalFilename = `alex_reid_${contentData.id}_${timestamp}.mp4`;
    const outputPath = path.join(__dirname, '../storage/videos', finalFilename);

    try {
      return new Promise((resolve, reject) => {
        let command = ffmpeg(video.path);

        // Add safety overlay if applicable
        if (contentData.safety_related && assets.overlays.find(o => o.includes('safety'))) {
          const safetyOverlay = assets.overlays.find(o => o.includes('safety'));
          command = command.input(safetyOverlay);
          
          command = command
            .complexFilter([
              '[0:v][1:v]overlay=0:0:enable=\'between(t,5,10)\'[safety]'
            ])
            .map('[safety]');
        }

        command
          .videoCodec('libx264')
          .videoBitrate(this.videoSettings.bitrate)
          .audioCodec('copy')
          .format('mp4')
          .output(outputPath)
          .on('end', async () => {
            // Get file size
            const stats = await fs.stat(outputPath);
            resolve({
              path: outputPath,
              filename: finalFilename,
              size: stats.size
            });
          })
          .on('error', reject)
          .run();
      });

    } catch (error) {
      logger.error('Failed to add text overlays:', error);
      throw error;
    }
  }

  /**
   * Generate video thumbnail
   */
  async generateThumbnail(contentData, assets) {
    const thumbnailFilename = `thumb_${contentData.id}_${Date.now()}.jpg`;
    const thumbnailPath = path.join(__dirname, '../storage/videos', thumbnailFilename);

    try {
      // Create custom thumbnail with title and Alex Reid branding
      const titleText = contentData.title || contentData.topic;
      const svgThumbnail = `
        <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
          <rect width="1280" height="720" fill="${this.brandingElements.colorScheme.primary}" />
          
          <!-- Background gradient -->
          <defs>
            <linearGradient id="thumbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${this.brandingElements.colorScheme.primary};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${this.brandingElements.colorScheme.secondary};stop-opacity:0.8" />
            </linearGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#thumbGradient)" />
          
          <!-- Title text -->
          <text x="640" y="300" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
                text-anchor="middle" fill="white">
            ${this.wrapText(titleText, 25)}
          </text>
          
          <!-- Alex Reid branding -->
          <text x="640" y="400" font-family="Arial, sans-serif" font-size="32" 
                text-anchor="middle" fill="white" opacity="0.9">
            Alex Reid • LARK Labs
          </text>
          
          <!-- HVAC Education tag -->
          <rect x="440" y="450" width="400" height="50" fill="white" opacity="0.2" rx="25" />
          <text x="640" y="485" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
                text-anchor="middle" fill="white">
            HVAC EDUCATION
          </text>
          
          <!-- Safety badge if applicable -->
          ${contentData.safety_related ? `
            <g transform="translate(1000, 150)">
              <circle cx="0" cy="0" r="60" fill="#DC2626" />
              <text x="0" y="-10" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
                    text-anchor="middle" fill="white">SAFETY</text>
              <text x="0" y="10" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
                    text-anchor="middle" fill="white">FOCUS</text>
            </g>
          ` : ''}
          
          <!-- Play button indicator -->
          <g transform="translate(640, 560)">
            <circle cx="0" cy="0" r="40" fill="white" opacity="0.9" />
            <polygon points="-15,-15 -15,15 20,0" fill="${this.brandingElements.colorScheme.primary}" />
          </g>
        </svg>
      `;

      await sharp(Buffer.from(svgThumbnail))
        .jpeg({ quality: 90 })
        .toFile(thumbnailPath);

      return {
        path: thumbnailPath,
        filename: thumbnailFilename
      };

    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate subtitles/captions
   */
  async generateSubtitles(contentData) {
    // TODO: Implement subtitle generation using speech-to-text or script parsing
    // For now, return placeholder
    return {
      format: 'srt',
      language: 'en-CA',
      content: '1\n00:00:00,000 --> 00:00:05,000\nHey HVAC family, Alex here from LARK Labs'
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(tempFiles) {
    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath);
        logger.debug('Cleaned up temp file:', path.basename(filePath));
      } catch (error) {
        logger.warn('Failed to clean up temp file:', filePath);
      }
    }
  }

  /**
   * Wrap text for display in videos
   */
  wrapText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  /**
   * Get video generation status and statistics
   */
  async getGeneratorStatus() {
    try {
      const videoDir = path.join(__dirname, '../storage/videos');
      const files = await fs.readdir(videoDir);
      const videoFiles = files.filter(f => f.endsWith('.mp4'));
      
      let totalSize = 0;
      for (const file of videoFiles) {
        const stats = await fs.stat(path.join(videoDir, file));
        totalSize += stats.size;
      }

      return {
        videos_generated: videoFiles.length,
        total_storage_used: totalSize,
        storage_path: videoDir,
        settings: this.videoSettings,
        branding: this.brandingElements.colorScheme
      };

    } catch (error) {
      logger.error('Failed to get video generator status:', error);
      return {
        videos_generated: 0,
        total_storage_used: 0,
        error: error.message
      };
    }
  }
}

module.exports = VideoGenerator;