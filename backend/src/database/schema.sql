-- LARK Labs AI Influencer Database Schema
-- Designed for PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content Calendar and Management
CREATE TABLE content_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    topic VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('technical', 'safety', 'customer_service', 'industry_update', 'wellness')),
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'generating', 'reviewing', 'ready', 'published', 'failed')),
    
    -- Generated content
    script TEXT,
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Social media IDs
    youtube_video_id VARCHAR(100),
    linkedin_post_id VARCHAR(100),
    facebook_post_id VARCHAR(100),
    
    -- Metadata
    duration_seconds INTEGER,
    target_audience VARCHAR(100) DEFAULT 'hvac_technicians',
    canadian_specific BOOLEAN DEFAULT true,
    safety_related BOOLEAN DEFAULT false,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- AI generation metadata
    ai_model_used VARCHAR(50) DEFAULT 'claude-sonnet-4',
    generation_prompt TEXT,
    research_sources JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Analytics
CREATE TABLE content_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES content_calendar(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('youtube', 'linkedin', 'facebook')),
    
    -- Performance metrics
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,2) DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    watch_time_seconds INTEGER DEFAULT 0,
    
    -- LARK Labs specific metrics
    lark_labs_clicks INTEGER DEFAULT 0,
    tool_downloads INTEGER DEFAULT 0,
    newsletter_signups INTEGER DEFAULT 0,
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(content_id, platform, recorded_at)
);

-- HVAC Knowledge Base
CREATE TABLE hvac_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    content TEXT NOT NULL,
    
    -- Classification
    canadian_specific BOOLEAN DEFAULT false,
    safety_related BOOLEAN DEFAULT false,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- Content metadata
    source_type VARCHAR(50) CHECK (source_type IN ('manual', 'research', 'community')),
    source_url VARCHAR(500),
    verified BOOLEAN DEFAULT false,
    verification_date DATE,
    
    -- Search and organization
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alex Reid Character Profile
CREATE TABLE character_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL DEFAULT 'Alex Reid',
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    -- Personality settings
    empathy_level INTEGER DEFAULT 8 CHECK (empathy_level BETWEEN 1 AND 10),
    technical_complexity INTEGER DEFAULT 7 CHECK (technical_complexity BETWEEN 1 AND 10),
    safety_focus INTEGER DEFAULT 10 CHECK (safety_focus BETWEEN 1 AND 10),
    brand_integration INTEGER DEFAULT 7 CHECK (brand_integration BETWEEN 1 AND 10),
    
    -- Voice and visual settings
    voice_id VARCHAR(100),
    voice_stability DECIMAL(3,2) DEFAULT 0.85,
    voice_clarity DECIMAL(3,2) DEFAULT 0.90,
    visual_style JSONB,
    
    -- Consistency metrics
    visual_consistency_score DECIMAL(5,2) DEFAULT 0,
    voice_consistency_score DECIMAL(5,2) DEFAULT 0,
    personality_consistency_score DECIMAL(5,2) DEFAULT 0,
    
    -- Catchphrases and signatures
    catchphrases TEXT[] DEFAULT ARRAY['Safety first, solutions second, success follows', 'Let''s troubleshoot this together', 'Remember, every expert was once a beginner'],
    sign_off_phrases TEXT[] DEFAULT ARRAY['Stay safe out there', 'See you next week', 'Keep learning, keep growing'],
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Engagement
CREATE TABLE community_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('comment', 'question', 'feedback', 'suggestion')),
    
    -- Content references
    content_id UUID REFERENCES content_calendar(id),
    original_post_id VARCHAR(200),
    
    -- User information (anonymized)
    user_handle VARCHAR(100),
    user_type VARCHAR(50) CHECK (user_type IN ('technician', 'student', 'business_owner', 'homeowner', 'unknown')),
    
    -- Interaction content
    message TEXT NOT NULL,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    topics_mentioned TEXT[] DEFAULT '{}',
    
    -- Response handling
    requires_response BOOLEAN DEFAULT false,
    response_generated TEXT,
    response_sent BOOLEAN DEFAULT false,
    response_type VARCHAR(50) CHECK (response_type IN ('automatic', 'manual', 'template')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Templates
CREATE TABLE content_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('intro', 'main_content', 'outro', 'full_script')),
    content_category VARCHAR(50),
    
    template_content TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research and Trending Topics
CREATE TABLE research_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query VARCHAR(255) NOT NULL,
    data_source VARCHAR(100) NOT NULL,
    
    -- Research results
    results JSONB NOT NULL,
    topic_trends JSONB,
    relevance_score DECIMAL(3,2) DEFAULT 0,
    
    -- Classification
    category VARCHAR(100),
    canadian_specific BOOLEAN DEFAULT false,
    urgency_level VARCHAR(20) CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency')),
    
    -- Usage tracking
    used_in_content BOOLEAN DEFAULT false,
    content_id UUID REFERENCES content_calendar(id),
    
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    
    config_type VARCHAR(50) DEFAULT 'application' CHECK (config_type IN ('application', 'character', 'social_media', 'ai_model')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_content_calendar_date ON content_calendar(date);
CREATE INDEX idx_content_calendar_status ON content_calendar(status);
CREATE INDEX idx_content_calendar_type ON content_calendar(content_type);

CREATE INDEX idx_analytics_content_id ON content_analytics(content_id);
CREATE INDEX idx_analytics_platform ON content_analytics(platform);
CREATE INDEX idx_analytics_recorded_at ON content_analytics(recorded_at);

CREATE INDEX idx_hvac_knowledge_category ON hvac_knowledge(category);
CREATE INDEX idx_hvac_knowledge_canadian ON hvac_knowledge(canadian_specific);
CREATE INDEX idx_hvac_knowledge_safety ON hvac_knowledge(safety_related);

CREATE INDEX idx_community_platform ON community_interactions(platform);
CREATE INDEX idx_community_requires_response ON community_interactions(requires_response);
CREATE INDEX idx_community_created_at ON community_interactions(created_at);

CREATE INDEX idx_research_category ON research_data(category);
CREATE INDEX idx_research_urgency ON research_data(urgency_level);
CREATE INDEX idx_research_expires_at ON research_data(expires_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_calendar_updated_at BEFORE UPDATE ON content_calendar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hvac_knowledge_updated_at BEFORE UPDATE ON hvac_knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_character_profile_updated_at BEFORE UPDATE ON character_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default character profile
INSERT INTO character_profile (name, version) VALUES ('Alex Reid', '1.0');

-- Insert default system configurations
INSERT INTO system_config (config_key, config_value, description) VALUES 
('content_generation_enabled', 'true', 'Enable autonomous content generation'),
('auto_publish_enabled', 'false', 'Enable automatic publishing without review'),
('daily_content_limit', '3', 'Maximum content pieces generated per day'),
('technical_review_required', 'true', 'Require human review for technical accuracy'),
('character_consistency_threshold', '95', 'Minimum consistency score required'),
('posting_schedule', '{"monday": "technical", "tuesday": "safety", "wednesday": "customer_service", "thursday": "industry_update", "friday": "troubleshooting", "saturday": "business", "sunday": "community"}', 'Weekly content posting schedule');

-- Sample HVAC knowledge entries
INSERT INTO hvac_knowledge (topic, category, content, canadian_specific, safety_related, difficulty_level, verified) VALUES
('Superheat Calculation', 'Refrigeration', 'Superheat is the temperature of refrigerant vapor above its saturation temperature. Calculate by subtracting saturation temperature from actual suction line temperature.', false, false, 3, true),
('CSA B52 Standards', 'Codes and Standards', 'Canadian Standards Association B52 covers mechanical refrigeration code requirements including safety, installation, and maintenance procedures.', true, true, 4, true),
('Heat Pump Cold Weather Operation', 'Heat Pumps', 'In Canadian climates below -15°C, heat pump efficiency drops significantly. Auxiliary heat typically engages, and defrost cycles become more frequent.', true, false, 3, true),
('Electrical Safety Lockout', 'Safety', 'Always use proper lockout/tagout procedures. Turn off power, tag the disconnect, test with meter, and test your meter before and after.', false, true, 2, true),
('R-410A Phase Out Timeline', 'Refrigerants', 'R-410A is being phased down under Montreal Protocol. New alternatives include R-32 and R-454B with lower GWP ratings.', false, false, 4, true);

-- Sample content templates
INSERT INTO content_templates (name, template_type, content_category, template_content, variables) VALUES
('Technical Intro', 'intro', 'technical', 'Hey HVAC family, Alex here from LARK Labs. Today we''re diving into {topic}. I got a great question from {questioner_name} about {specific_issue}. Let''s troubleshoot this together.', '{"topic": "", "questioner_name": "", "specific_issue": ""}'),
('Safety Alert Intro', 'intro', 'safety', 'HVAC family, we need to talk about something serious today. I''ve been in this industry for over 20 years, and I''ve seen too many preventable {incident_type}. Today''s topic might literally save your life.', '{"incident_type": ""}'),
('Standard Outro', 'outro', 'general', 'Stay safe out there, and remember - every expert was once a beginner. Don''t forget to grab our free {tool_name} at larklabs.org. What''s your biggest challenge with {topic}? Drop a comment below. See you next week!', '{"tool_name": "", "topic": ""}');

-- Sample content calendar entries
INSERT INTO content_calendar (date, topic, content_type, status, target_audience, canadian_specific, safety_related, difficulty_level) VALUES
(CURRENT_DATE + INTERVAL '1 day', 'Why Your Superheat Readings Don''t Make Sense', 'technical', 'planned', 'hvac_technicians', false, false, 3),
(CURRENT_DATE + INTERVAL '2 days', 'The #1 Safety Mistake New Techs Make', 'safety', 'planned', 'hvac_students', false, true, 2),
(CURRENT_DATE + INTERVAL '3 days', 'Customer Communication: When They Say It''s Not Cold Enough', 'customer_service', 'planned', 'hvac_technicians', false, false, 2),
(CURRENT_DATE + INTERVAL '4 days', 'Heat Pump vs Furnace: Canadian Climate Considerations', 'technical', 'planned', 'hvac_technicians', true, false, 3),
(CURRENT_DATE + INTERVAL '5 days', 'Mental Health Check: Dealing with Difficult Days in HVAC', 'wellness', 'planned', 'hvac_technicians', false, false, 1);

COMMIT;