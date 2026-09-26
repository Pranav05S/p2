import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/errors';
import { getValidSpotifyAccessToken } from '../services/spotifyConnection';
import { getRecentlyPlayed, getTopItems, SpotifyArtist, SpotifyTrack } from '../services/spotify';
import { upsertArtistFromSpotify, upsertTrackFromSpotify } from '../services/catalog';
import { toArtistSummary } from '../services/serializers';

export const statsRouter = Router();

const rangeSchema = z.enum(['short_term', 'medium_term', 'long_term']).default('medium_term');
const providerSchema = z.enum(['spotify', 'apple_music', 'amazon_music', 'youtube_music']);

function requireSpotify(provider: string) {
  if (provider !== 'spotify') {
    throw ApiError.providerUnavailable(
      `${provider} does not currently support this endpoint. Only spotify is fully integrated - see openapi.yaml.`,
    );
  }
}

statsRouter.get(
  '/top-artists',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = providerSchema.parse(req.query.provider);
    const range = rangeSchema.parse(req.query.range);
    requireSpotify(provider);

    const { accessToken } = await getValidSpotifyAccessToken(req.userId!);
    const items = (await getTopItems(accessToken, 'artists', range)) as SpotifyArtist[];
    const artists = await Promise.all(items.map((a) => upsertArtistFromSpotify(a)));

    res.json({
      provider,
      range,
      generated_at: new Date().toISOString(),
      items: artists.map((artist, i) => ({ rank: i + 1, artist: toArtistSummary(artist), track: null })),
    });
  }),
);

statsRouter.get(
  '/top-tracks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = providerSchema.parse(req.query.provider);
    const range = rangeSchema.parse(req.query.range);
    requireSpotify(provider);

    const { accessToken } = await getValidSpotifyAccessToken(req.userId!);
    const items = (await getTopItems(accessToken, 'tracks', range)) as SpotifyTrack[];
    const tracks = await Promise.all(items.map((t) => upsertTrackFromSpotify(t)));

    res.json({
      provider,
      range,
      generated_at: new Date().toISOString(),
      items: tracks.map((track, i) => ({
        rank: i + 1,
        artist: null,
        track: { id: track.id, title: track.title, artist: toArtistSummary(track.artist) },
      })),
    });
  }),
);

statsRouter.get(
  '/listening-time',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = providerSchema.parse(req.query.provider);
    const range = rangeSchema.parse(req.query.range);
    requireSpotify(provider);

    const { accessToken, connectedAt } = await getValidSpotifyAccessToken(req.userId!);
    // Spotify exposes only the last 50 recently-played items, not a
    // historical total - this is a best-effort estimate, never a lifetime
    // figure, and is bounded to what's happened since connectedAt.
    const items = await getRecentlyPlayed(accessToken, connectedAt.getTime());
    const estimatedMs = items.reduce((sum, item) => sum + item.track.duration_ms, 0);
    const coverageStart = items.length ? items[items.length - 1].played_at : connectedAt.toISOString();
    const coverageEnd = items.length ? items[0].played_at : new Date().toISOString();

    res.json({
      provider,
      range,
      estimated_ms: estimatedMs,
      coverage_start: coverageStart,
      coverage_end: coverageEnd,
      note:
        'Estimated from polled listening activity since you connected this account. Streaming providers do not expose historical total listening time via API, so this is not a lifetime total.',
    });
  }),
);
