import { prisma } from '../lib/prisma';
import type { SpotifyAlbum, SpotifyArtist, SpotifyTrack } from './spotify';

// Canonical entities are keyed by external_ids.spotify for now (Spotify is the
// only fully-integrated provider). Adding a provider means matching on
// external_ids.<provider> or a shared identifier (ISRC/UPC) here, not
// changing callers.

export async function upsertArtistFromSpotify(spotifyArtist: SpotifyArtist) {
  const existing = await prisma.artist.findFirst({
    where: { externalIds: { path: ['spotify'], equals: spotifyArtist.id } },
  });
  const data = {
    name: spotifyArtist.name,
    imageUrl: spotifyArtist.images?.[0]?.url ?? null,
    genres: spotifyArtist.genres ?? [],
    externalIds: { spotify: spotifyArtist.id },
  };
  if (existing) {
    return prisma.artist.update({ where: { id: existing.id }, data });
  }
  return prisma.artist.create({ data });
}

export async function upsertAlbumFromSpotify(spotifyAlbum: SpotifyAlbum) {
  const artist = await upsertArtistFromSpotify(spotifyAlbum.artists[0]);
  const existing = await prisma.album.findFirst({
    where: { externalIds: { path: ['spotify'], equals: spotifyAlbum.id } },
  });
  const releaseDate = parseReleaseDate(spotifyAlbum.release_date);
  const data = {
    title: spotifyAlbum.name,
    artistId: artist.id,
    coverUrl: spotifyAlbum.images?.[0]?.url ?? null,
    releaseDate,
    externalIds: { spotify: spotifyAlbum.id },
  };
  if (existing) {
    return prisma.album.update({ where: { id: existing.id }, data, include: { artist: true } });
  }
  return prisma.album.create({ data, include: { artist: true } });
}

export async function upsertTrackFromSpotify(spotifyTrack: SpotifyTrack) {
  const album = spotifyTrack.album ? await upsertAlbumFromSpotify(spotifyTrack.album) : null;
  const artist = await upsertArtistFromSpotify(spotifyTrack.artists[0]);
  const existing = await prisma.track.findFirst({
    where: { externalIds: { path: ['spotify'], equals: spotifyTrack.id } },
  });
  const data = {
    title: spotifyTrack.name,
    albumId: album?.id ?? null,
    artistId: artist.id,
    durationMs: spotifyTrack.duration_ms,
    trackNumber: spotifyTrack.track_number ?? null,
    externalIds: { spotify: spotifyTrack.id },
  };
  if (existing) {
    return prisma.track.update({ where: { id: existing.id }, data, include: { artist: true, album: true } });
  }
  return prisma.track.create({ data, include: { artist: true, album: true } });
}

function parseReleaseDate(value: string | undefined): Date | null {
  if (!value) return null;
  // Spotify release_date can be "YYYY", "YYYY-MM" or "YYYY-MM-DD"
  const parts = value.split('-');
  const iso = [parts[0], parts[1] ?? '01', parts[2] ?? '01'].join('-');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
