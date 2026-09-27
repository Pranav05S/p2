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

## Deploying

A `render.yaml` at the repo root defines both services as a
[Render Blueprint](https://render.com/docs/blueprint-spec): `rated-server`
(the API) and `rated-web` (the static frontend build). Database hosting is
external ([Neon](https://neon.com)'s free tier) rather than Render's own
Postgres, since Neon's free tier doesn't expire.

1. **Database**: create a free Neon project and copy its connection string.
2. **Spotify app**: in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard),
   add `https://rated-server.onrender.com/v1/connections/spotify/callback` as
   an additional Redirect URI on your existing app (you can keep the
   `127.0.0.1` one too - Spotify allows multiple).
3. **Render**: create an account, connect this GitHub repo, choose
   **New > Blueprint**, and select it. Render reads `render.yaml` and
   provisions both services. It will prompt you for the values marked
   `sync: false`: paste in the Neon connection string as `DATABASE_URL`, and
   your Spotify app's `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`.
4. **Check the assigned URLs**: `render.yaml` assumes Render gives you
   `rated-server.onrender.com` and `rated-web.onrender.com`. Render subdomains
   are global, so if either name was already taken by someone else, yours
   will get a random suffix instead. If that happens, open each service's
   **Environment** tab on Render and update `APP_BASE_URL`,
   `SERVER_BASE_URL`, `SPOTIFY_REDIRECT_URI` (backend) and
   `VITE_API_BASE_URL` (frontend) to match the URLs Render actually gave you,
   update the redirect URI on the Spotify app to match too, then trigger a
   manual redeploy of both services (the frontend especially, since
   `VITE_API_BASE_URL` is baked in at build time, not read at runtime).

The free plan spins the backend down after 15 minutes of no traffic and
wakes it on the next request (a few seconds of delay on that first request) -
fine for a personal project, not for something that needs to always respond
instantly.

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
