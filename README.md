# Meal Planner

A full-stack meal planning app that generates personalized weekly meal plans using the Edamam Meal Planner API, with user authentication and plan caching via Supabase.

## Features

- Generate weekly meal plans based on dietary preferences and nutritional goals
- Detailed recipes and nutritional info for each meal
- User authentication via Supabase Auth
- Cached meal plans to avoid redundant API calls

## Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) project (database + auth)
- An [Edamam](https://developer.edamam.com) API key

## Quick Start

### 1. Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 2. Configure environment

Create `server/.env`:

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
CLIENT_URL=http://localhost:5173
```

### 3. Run

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Architecture

| Layer | Tech | Details |
|-------|------|---------|
| Frontend | React 19, Vite 8, Tailwind 4 | SPA with React Router, Supabase JS client for auth |
| Backend | Express 5 | REST API, CORS for frontend origin |
| Database | Supabase (PostgreSQL) | Stores meal plans per user |
| External API | Edamam Meal Planner | Generates meal plans server-side |

## API Endpoints

| Method | Endpoint  | Description |
|--------|-----------|-------------|
| GET    | `/health` | Health check — returns `{ status: "Okay!" }` |

## License

ISC