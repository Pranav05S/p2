import type { Album, Artist, ConnectedAccount, Track, User } from '@prisma/client';

export function toUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    bio: user.bio,
    created_at: user.createdAt.toISOString(),
  };
}

export function toPublicUser(user: User) {
  return {
    username: user.username,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    bio: user.bio,
  };
}

export function toConnectedAccount(account: ConnectedAccount) {
  return {
    id: account.id,
    provider: account.provider,
    status: account.status,
    scopes: account.scopes,
    connected_at: account.connectedAt.toISOString(),
    last_synced_at: account.lastSyncedAt?.toISOString() ?? null,
  };
}

export function toArtistSummary(artist: Artist) {
  return { id: artist.id, name: artist.name };
}

export function toArtist(artist: Artist) {
  return {
    id: artist.id,
    name: artist.name,
    image_url: artist.imageUrl,
    genres: artist.genres.length ? artist.genres : null,
    external_ids: artist.externalIds,
  };
}

export function toAlbumSummary(album: Album) {
  return { id: album.id, title: album.title, cover_url: album.coverUrl };
}

export function toAlbum(album: Album & { artist: Artist }) {
  return {
    id: album.id,
    title: album.title,
    artist: toArtistSummary(album.artist),
    release_date: album.releaseDate ? album.releaseDate.toISOString().slice(0, 10) : null,
    cover_url: album.coverUrl,
    external_ids: album.externalIds,
  };
}

export function toTrack(track: Track & { artist: Artist; album: Album | null }) {
  return {
    id: track.id,
    title: track.title,
    album: track.album ? toAlbumSummary(track.album) : null,
    artist: toArtistSummary(track.artist),
    duration_ms: track.durationMs,
    track_number: track.trackNumber,
    external_ids: track.externalIds,
  };
}
