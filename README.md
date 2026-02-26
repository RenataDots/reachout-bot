# Reach Out Bot

Lightweight MVP for NGO outreach. This project accepts a short brief, finds matching NGOs, and helps generate outreach emails.

## Setup

1. Copy `.env.example` to `.env` and configure values:
   - `PORT`: Server port (default: 3000)
   - `API_BASE_URL`: Frontend API base URL (default: http://localhost:3000/api)
   - `MOCK_DATA_DIR`: Directory for mock data storage (default: ./data/mock-data)

   The application uses a built-in NGO database and does not require external API keys.

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

## Security

- Keep `.env` out of version control. `.gitignore` already ignores `.env`.

## Development notes

- The search implementation is in `integrations/ngo-search.ts` and the API entrypoint is `server/api.ts`.
- Frontend files live in `frontend/` and the static server serves them directly.
