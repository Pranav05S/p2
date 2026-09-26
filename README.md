# Rated

A Letterboxd-style app for music: rate and review tracks/albums/artists, keep
a listening diary, and link streaming accounts (Spotify today; Apple Music,
Amazon Music, YouTube Music planned - see `openapi.yaml` for the per-provider
feasibility notes) to pull top artists/tracks and estimated listening time
into your profile.

- `openapi.yaml` - the API specification
- `server/` - Express + TypeScript + Prisma + PostgreSQL API implementing it
- `web/` - React + TypeScript (Vite) frontend

## Running locally

**Requirements:** Node 20+, a PostgreSQL 16 instance (via Docker or a local
install), a Spotify app (free, from the
[Spotify Developer Dashboard](https://developer.spotify.com/dashboard)) if
you want search/ratings/stats to actually return data instead of catalog
lookups being empty.

### 1. Database

```
docker compose up -d postgres
```

(Or point `DATABASE_URL` in `server/.env` at any Postgres 16 instance you
already have running.)

### 2. Server

```
cd server
cp .env.example .env
# fill in SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from your Spotify app
# (redirect URI registered on the app must match SPOTIFY_REDIRECT_URI)
npm install
npm run prisma:migrate
npm run dev
```

Runs on `http://localhost:4000`. Health check: `GET /health`.

### 3. Web app

```
cd web
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## What works today

- Accounts (register/login/JWT refresh), profile editing
- Rating tracks/albums/artists on a 0.5-5.0 half-star scale, with reviews
- A listening diary (log a listen on a specific date, optionally rated)
- Public profile pages with rating-derived stats (highest rated
  albums/tracks/artists, average score, ratings histogram, favorite genres,
  most active month)
- Catalog search backed by Spotify's public catalog, with results cached
  into this app's own canonical Artist/Album/Track tables (see
  `openapi.yaml`'s "Design principles" for why ratings aren't tied directly
  to Spotify IDs)
- Connecting a Spotify account (OAuth) and pulling top artists/tracks over
  Spotify's short/medium/long-term ranges, plus an *estimated* listening-time
  figure (Spotify doesn't expose a true historical total via API - see the
  spec for details)

Apple Music, Amazon Music and YouTube Music are stubbed in the data model
(`Provider` enum) but not wired up - their current real-world API access
constraints are documented in `openapi.yaml`.
