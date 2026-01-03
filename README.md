# Gleano

A Chrome/Edge extension that captures subtitles from YouTube and Netflix, then uses AI to generate personalized learning content based on your language level.

## Features

- Automatic subtitle capture from YouTube and Netflix
- Web Speech API fallback for content without subtitles
- AI-powered vocabulary extraction (Google Gemini)
- Personalized learning based on CEFR levels (A1-C2)
- Multi-language support
- Learning history and favorites

## Tech Stack

- **Extension**: React + TypeScript + Vite + shadcn/ui
- **Backend**: Cloudflare Workers + Hono + D1 + KV
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare account
- Google Gemini API key

### Installation

```bash
# Clone and install dependencies
cd gleano
pnpm install
```

### Cloudflare Setup

1. Create D1 database:
```bash
cd worker
wrangler d1 create gleano-db
```

2. Update `wrangler.toml` with your D1 database ID.

3. Apply database schema:
```bash
wrangler d1 execute gleano-db --local --file=src/db/schema.sql
```

4. Create KV namespace:
```bash
wrangler kv namespace create CACHE
```

5. Update `wrangler.toml` with your KV namespace ID.

6. Set Gemini API key:
```bash
wrangler secret put GEMINI_API_KEY
```

### Development

```bash
# Start all services
pnpm dev

# Or individually:
cd extension && pnpm dev  # Build extension in watch mode
cd worker && pnpm dev     # Start worker locally
```

### Load Extension

1. Build the extension: `cd extension && pnpm build`
2. Open Chrome/Edge and go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension/dist` folder

### Deployment

```bash
# Deploy worker
cd worker && pnpm deploy

# Apply migrations to production
pnpm db:migrate:prod
```

Don't forget to update `API_BASE_URL` in `extension/src/background/index.ts` with your worker URL.

## Project Structure

```
gleano/
├── extension/          # Chrome extension
│   ├── src/
│   │   ├── content/    # Content scripts (YouTube, Netflix)
│   │   ├── background/ # Service worker
│   │   ├── popup/      # Popup UI
│   │   ├── sidepanel/  # Side panel UI
│   │   └── components/ # shadcn/ui components
│   └── manifest.json
├── worker/             # Cloudflare Worker
│   └── src/
│       ├── routes/     # API routes
│       ├── services/   # AI integration
│       └── db/         # D1 schema
└── shared/             # Shared types
```

## Extension Icons

Add your icon files to `extension/icons/`:
- `icon16.png` (16x16)
- `icon32.png` (32x32)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## License

MIT
