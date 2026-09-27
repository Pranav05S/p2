import { prisma } from '../lib/prisma';
import { toAlbumSummary, toArtistSummary } from './serializers';

const TOP_N = 5;

export async function computeProfileStats(userId: string) {
  const ratings = await prisma.rating.findMany({ where: { userId } });
  const totalDiaryEntries = await prisma.diaryEntry.count({ where: { userId } });

  const distribution: Record<string, number> = {};
  for (let s = 0.5; s <= 5; s += 0.5) distribution[s.toFixed(1)] = 0;
  let sum = 0;
  for (const r of ratings) {
    distribution[r.score.toFixed(1)] = (distribution[r.score.toFixed(1)] ?? 0) + 1;
    sum += r.score;
  }
  const averageScore = ratings.length ? sum / ratings.length : null;

  const albumRatings = ratings.filter((r) => r.subjectType === 'album');
  const trackRatings = ratings.filter((r) => r.subjectType === 'track');
  const artistRatings = ratings.filter((r) => r.subjectType === 'artist');

  const [topAlbums, topTracks, topArtists] = await Promise.all([
    topN(albumRatings, TOP_N, async (r) => {
      const album = await prisma.album.findUnique({ where: { id: r.subjectId } });
      return album ? { album: toAlbumSummary(album), score: r.score } : null;
    }),
    topN(trackRatings, TOP_N, async (r) => {
      const track = await prisma.track.findUnique({ where: { id: r.subjectId } });
      return track ? { track: { id: track.id, title: track.title }, score: r.score } : null;
    }),
    topN(artistRatings, TOP_N, async (r) => {
      const artist = await prisma.artist.findUnique({ where: { id: r.subjectId } });
      return artist ? { artist: toArtistSummary(artist), score: r.score } : null;
    }),
  ]);

  const favoriteGenres = await computeFavoriteGenres(ratings);
  const mostActiveMonth = await computeMostActiveMonth(userId);
  const mostListenedTracks = await computeMostListenedTracks(userId);

  return {
    total_ratings: ratings.length,
    total_diary_entries: totalDiaryEntries,
    average_score: averageScore,
    ratings_distribution: distribution,
    top_rated_albums: topAlbums,
    top_rated_tracks: topTracks,
    top_rated_artists: topArtists,
    most_listened_tracks: mostListenedTracks,
    favorite_genres: favoriteGenres,
    most_active_month: mostActiveMonth,
  };
}

// "Listen count" is how many diary entries the user has logged for a track,
// not a figure pulled from a streaming provider - no provider API exposes
// per-track lifetime play counts, so this only reflects listens the user
// has explicitly logged in their diary, re-listens included.
async function computeMostListenedTracks(userId: string) {
  const entries = await prisma.diaryEntry.findMany({
    where: { userId, subjectType: 'track' },
    select: { subjectId: true },
  });
  if (entries.length === 0) return [];

  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.subjectId, (counts.get(e.subjectId) ?? 0) + 1);

  const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const tracks = await prisma.track.findMany({ where: { id: { in: topIds.map(([id]) => id) } } });
  const trackById = new Map(tracks.map((t) => [t.id, t]));

  return topIds
    .map(([id, count]) => {
      const track = trackById.get(id);
      return track ? { track: { id: track.id, title: track.title }, listen_count: count } : null;
    })
    .filter((x): x is { track: { id: string; title: string }; listen_count: number } => x !== null);
}

async function topN<T extends { score: number; updatedAt: Date }, R>(
  ratings: T[],
  n: number,
  map: (r: T) => Promise<R | null>,
): Promise<R[]> {
  const sorted = [...ratings].sort((a, b) => b.score - a.score || b.updatedAt.getTime() - a.updatedAt.getTime());
  const mapped = await Promise.all(sorted.slice(0, n).map(map));
  return mapped.filter((x) => x !== null) as R[];
}

async function computeFavoriteGenres(ratings: { subjectType: string; subjectId: string }[]) {
  const artistIds = new Set<string>();
  for (const r of ratings) {
    if (r.subjectType === 'artist') artistIds.add(r.subjectId);
  }
  const albumIds = [...new Set(ratings.filter((r) => r.subjectType === 'album').map((r) => r.subjectId))];
  const trackIds = [...new Set(ratings.filter((r) => r.subjectType === 'track').map((r) => r.subjectId))];

  const [albums, tracks] = await Promise.all([
    albumIds.length ? prisma.album.findMany({ where: { id: { in: albumIds } } }) : [],
    trackIds.length ? prisma.track.findMany({ where: { id: { in: trackIds } } }) : [],
  ]);
  for (const a of albums) artistIds.add(a.artistId);
  for (const t of tracks) artistIds.add(t.artistId);

  if (artistIds.size === 0) return null;

  const artists = await prisma.artist.findMany({ where: { id: { in: [...artistIds] } } });
  const counts = new Map<string, number>();
  for (const artist of artists) {
    for (const genre of artist.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));
}

async function computeMostActiveMonth(userId: string): Promise<string | null> {
  const entries = await prisma.diaryEntry.findMany({ where: { userId }, select: { listenedOn: true } });
  if (entries.length === 0) return null;
  const counts = new Map<string, number>();
  for (const e of entries) {
    const key = e.listenedOn.toISOString().slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
