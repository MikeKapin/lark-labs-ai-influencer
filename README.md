# LARK Labs AI Influencer System

A complete autonomous AI influencer system that creates daily educational HVAC content for Canadian technicians through the character "Alex Reid" - an empathetic HVAC educator with 20+ years of field experience.

## 🤖 Core Features

### Autonomous Content Creation
- **Anthropic Claude Sonnet 4** as primary AI engine with web search capabilities
- Daily content generation based on real-time HVAC industry research
- Alex Reid character with consistent personality, voice, and visual identity
- Multi-platform publishing (YouTube, LinkedIn, Facebook)

### Canadian HVAC Specialization
- CSA standards and provincial regulation compliance
- Metric measurements and Canadian climate considerations
- Regional HVAC practices and certification requirements
- Weather-based seasonal content adaptation

### Complete Automation
- Real-time industry news and regulation monitoring
- Autonomous topic selection and content creation
- Scheduled publishing with optimal timing
- Community engagement and comment responses
- Performance analytics and strategy optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Anthropic API Key (primary requirement)
- Social media API credentials

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd lark-labs-ai-influencer
   npm install
   npm run setup
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start development**:
   ```bash
   npm run dev
   ```

4. **Or use Docker**:
   ```bash
   docker-compose up -d
   ```

## 🎭 Alex Reid Character

**Background**: Experienced HVAC educator with 20+ years field experience
**Personality**: Empathetic mentor, safety-focused, bridges traditional knowledge with modern tools
**Target Audience**: Canadian HVAC technicians, students, business owners
**Content Focus**: Technical education, safety procedures, customer service, industry updates

### Character Traits
- Empathetic and patient teaching style
- Always prioritizes safety procedures
- Uses "we" language to build community
- Acknowledges learning difficulties honestly
- Connects traditional skills with modern technology

## 📊 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Research  │    │    Content       │    │   Multi-Platform│
│   & Trend       │───▶│   Generation     │───▶│   Publishing    │
│   Analysis      │    │   (Claude AI)    │    │   (YT/LI/FB)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HVAC          │    │   Alex Reid      │    │   Performance   │
│   Knowledge     │    │   Character      │    │   Analytics &   │
│   Base          │    │   Engine         │    │   Optimization  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 API Endpoints

### Content Management
- `POST /api/content/autonomous-generate` - Trigger autonomous content creation
- `GET /api/content/calendar` - Get content calendar
- `PUT /api/content/:id/publish` - Publish content
- `GET /api/content/:id/analytics` - Get content performance

### Research & Analysis
- `POST /api/research/industry-updates` - Get latest HVAC industry news
- `POST /api/research/canadian-regulations` - Research Canadian HVAC codes
- `POST /api/research/weather-impact` - Weather-based content suggestions

### Character Management
- `GET /api/character/profile` - Get Alex Reid profile
- `PUT /api/character/settings` - Update character settings
- `POST /api/character/voice/test` - Test voice synthesis

## 📈 Content Strategy

### Daily Schedule
- **Monday**: Technical Deep-Dive
- **Tuesday**: Safety and Best Practices  
- **Wednesday**: Customer Service and Communication
- **Thursday**: Industry Updates and Technology
- **Friday**: Troubleshooting and Problem-Solving
- **Saturday**: Business and Career Development
- **Sunday**: Community Q&A and Engagement

### Content Distribution
- **Technical Education**: 40%
- **Safety & Procedures**: 25%
- **Customer Relations**: 20%
- **Industry Updates**: 10%
- **Community & Wellness**: 5%

## 🔐 Security & Privacy

- JWT-based API authentication
- Encrypted API key storage
- Content moderation and review systems
- Privacy-compliant analytics
- Secure media storage (AWS S3)

## 📱 Dashboard Features

- Real-time content pipeline monitoring
- Alex Reid character consistency tracking
- Multi-platform analytics dashboard
- Community engagement management
- Autonomous system status monitoring

## 🛠 Development

### Project Structure
```
lark-labs-ai-influencer/
├── backend/          # Node.js/Express API
├── frontend/         # React/Vite dashboard
├── scripts/          # Utility scripts
├── docs/            # Documentation
└── docker-compose.yml
```

### Key Technologies
- **AI**: Anthropic Claude Sonnet 4, ElevenLabs
- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Frontend**: React, Vite, Tailwind CSS
- **Video**: FFmpeg, automated rendering pipeline
- **APIs**: YouTube Data API, LinkedIn Marketing API, Facebook Graph API

## 🎯 Success Metrics

- **Content Quality**: 98%+ technical accuracy rate
- **Character Consistency**: 95%+ visual and voice consistency
- **Performance**: 100% daily posting consistency
- **Engagement**: 8%+ average engagement rate
- **Conversion**: Track LARK Labs tool downloads and traffic

## 📞 Support

For technical support or questions:
- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@larklabs.org

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ by LARK Labs for the HVAC community**