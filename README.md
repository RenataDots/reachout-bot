# Reach Out Bot

Intelligent NGO outreach platform that combines AI-powered search with local database fallback. The system accepts campaign briefs, finds matching environmental NGOs using both Grok AI and a curated local database, and helps generate personalized outreach emails.

## Features

- 🤖 **Grok AI Integration**: Intelligent NGO recommendations via xAI's Grok API
- 🗄️ **Local Database**: 41 curated environmental NGOs as reliable fallback
- 🔄 **Hybrid Search**: Tries Grok API first, gracefully degrades to local database
- 📊 **Smart Matching**: Advanced brief processing with geographic and focus area analysis
- 📧 **Complete Profiles**: Full NGO data including risk assessment and partnership potential

## Setup

1. Copy `.env.example` to `.env` and configure values:
   - `PORT`: Server port (default: 3000)
   - `API_BASE_URL`: Frontend API base URL (default: http://localhost:3000/api)
   - `MOCK_DATA_DIR`: Directory for mock data storage (default: ./data/mock-data)
   - `XAI_API_KEY`: xAI API key for Grok integration (required for AI search)
   - `GROK_MODEL`: Grok model to use (default: grok-4-1-fast-reasoning)
   - `GROK_TEMPERATURE`: AI response temperature (default: 0.3)
   - `GROK_MAX_TOKENS`: Maximum response tokens (default: 4000)

2. Install dependencies and build:

```bash
npm install
npm run build
```

3. Run the server (development):

```bash
npm run server
```

The server will be available at http://localhost:3000

## Architecture

### Search Flow

```
Campaign Brief → Brief Processing → Try Grok API
                                    ↓ (if fails)
                              Local Database Search → NGO Results
```

### Components

- **Frontend**: `frontend/app.js` - Web interface for campaign briefs
- **API Server**: `server/api.ts` - REST endpoints and search orchestration
- **Grok Integration**: `integrations/grok-search.ts` - xAI API client
- **Local Database**: `integrations/ngo-search.ts` - 41 curated environmental NGOs
- **Brief Processing**: Advanced text analysis with geographic and intent extraction

## Security

- Keep `.env` out of version control. `.gitignore` already ignores `.env`.
- API keys are loaded securely via environment variables.

## Development Notes

- **Hybrid Search**: System prioritizes Grok API but maintains full functionality with local database
- **Error Handling**: Graceful degradation ensures users always get results
- **NGO Database**: 41 real environmental organizations with complete profiles
- **Grok API**: Uses official xAI endpoints with proper authentication
