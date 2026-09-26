import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import { getAppAccessToken, search as spotifySearch, SpotifyAlbum, SpotifyArtist, SpotifyTrack } from '../services/spotify';
import { upsertAlbumFromSpotify, upsertArtistFromSpotify, upsertTrackFromSpotify } from '../services/catalog';
import { toAlbum, toArtist, toTrack } from '../services/serializers';

export const catalogRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1),
  type: z.enum(['artist', 'album', 'track']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

catalogRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const query = searchQuerySchema.parse(req.query);
    const types = query.type ? [query.type] : ['artist', 'album', 'track'];
    const token = await getAppAccessToken();
    const data = await spotifySearch(token, query.q, types, query.limit);

    const [artists, albums, tracks] = await Promise.all([
      Promise.all((data.artists?.items ?? []).map((a: SpotifyArtist) => upsertArtistFromSpotify(a))),
      Promise.all((data.albums?.items ?? []).map((a: SpotifyAlbum) => upsertAlbumFromSpotify(a))),
      Promise.all((data.tracks?.items ?? []).map((t: SpotifyTrack) => upsertTrackFromSpotify(t))),
    ]);

    res.json({
      artists: artists.map(toArtist),
      albums: albums.map(toAlbum),
      tracks: tracks.map(toTrack),
    });
  }),
);

catalogRouter.get(
  '/artists/:id',
  asyncHandler(async (req, res) => {
    const artist = await prisma.artist.findUnique({ where: { id: req.params.id } });
    if (!artist) throw ApiError.notFound('Artist not found');
    res.json(toArtist(artist));
  }),
);

catalogRouter.get(
  '/albums/:id',
  asyncHandler(async (req, res) => {
    const album = await prisma.album.findUnique({
      where: { id: req.params.id },
      include: { artist: true, tracks: { include: { artist: true, album: true } } },
    });
    if (!album) throw ApiError.notFound('Album not found');
    res.json({ ...toAlbum(album), tracks: album.tracks.map(toTrack) });
  }),
);

catalogRouter.get(
  '/tracks/:id',
  asyncHandler(async (req, res) => {
    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      include: { artist: true, album: true },
    });
    if (!track) throw ApiError.notFound('Track not found');
    res.json(toTrack(track));
  }),
);
