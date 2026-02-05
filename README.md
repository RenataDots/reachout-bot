# Reach Out Bot

Lightweight MVP for NGO outreach. This project accepts a short brief, finds matching NGOs, and helps generate outreach emails.

## Setup

1. Copy `.env.example` to `.env` and fill in values:

   - `GOOGLE_API_KEY`: API key from Google Cloud for the Custom Search API
   - `GOOGLE_CX`: Custom Search Engine ID (cx) from the CSE control panel

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

## Obtaining Google Custom Search (CSE) credentials

1. Go to https://console.cloud.google.com and create or select a project.
2. Enable the **Custom Search JSON API** for that project.
3. Create an **API key** under `APIs & Services > Credentials` and copy it to `GOOGLE_API_KEY`.
4. Go to https://cse.google.com/cse/ and create a new search engine. In the control panel set it to search the entire web (Edit search engine > Sites to search: `Search the entire web` or add `*`).
5. Copy the **Search engine ID** (labeled `cx`) into `GOOGLE_CX`.

Note: If `GOOGLE_API_KEY` and `GOOGLE_CX` are not set, the server uses a curated local NGO fallback database.

## Security

- Keep `.env` out of version control. `.gitignore` already ignores `.env`.

## Development notes

- The search implementation is in `integrations/ngo-search.ts` and the API entrypoint is `server/api.ts`.
- Frontend files live in `frontend/` and the static server serves them directly.
