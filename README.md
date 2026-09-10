# Meal Planner

A full-stack meal planning app using the Edamam Meal Planner API. Users can generate personalized meal plans based on dietary preferences and nutritional goals.

## What It Does

- Generates weekly meal plans using the Edamam Meal Planner API
- Provides detailed recipes and nutritional information for each meal
- Caches generated meal plans in a Supabase database to avoid redundant API calls
- Supports user authentication and personalized meal plans via Supabase Auth

## How to Run It

### Prerequisites

- Node.js (v18+)
- npm or yarn
- A Supabase project (for database and auth)
- An Edamam API key (for meal plan generation)

### Backend (Server)

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

The server runs on `http://localhost:3001` by default.

### Frontend (Client)

```bash
cd client
npm install
```

```bash
npm run dev
```

The client runs on `http://localhost:5173` by default.

## Architecture

```
client/                # React frontend (Vite)
  src/
    App.jsx            # Main app component
    main.jsx           # Entry point
    index.css          # Tailwind CSS styles

server/                # Express backend
  src/
    index.js           # Server entry point, middleware setup, health check
```

- **Frontend**: React 19 + Tailwind CSS 4, built with Vite. Uses React Router for navigation and the Supabase JS client for auth/data.
- **Backend**: Express 5 API server with CORS configured for the frontend origin. Connects to Supabase for persistence and calls the Edamam API for meal plan generation.
- **Database**: Supabase (PostgreSQL) — stores meal plans per user to cache API responses.

## API Endpoints

| Method | Endpoint  | Description |
| ------ | --------- | ----------- |
| GET    | `/health` | Health check (returns `{ status: "Okay!" }`) |