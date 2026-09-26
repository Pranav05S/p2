import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import type {
  ConnectedAccount,
  DiaryEntry,
  PaginatedDiary,
  PaginatedRatings,
  ProfileStats,
  Rating,
} from '../lib/types';
import { ConnectionsPanel } from '../components/ConnectionsPanel';
import { SpotifyStatsPanel } from '../components/SpotifyStatsPanel';

export function Profile() {
  const { username: paramUsername } = useParams<{ username: string }>();
  const { user } = useAuth();
  const username = paramUsername ?? user?.username;
  const isOwnProfile = !!user && username === user.username;

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setError(null);
    apiFetch<ProfileStats>(`/users/${username}/stats`, { auth: false })
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load profile'));
    apiFetch<PaginatedRatings>(`/users/${username}/ratings`, { auth: false, query: { sort: 'highest', page_size: 10 } }).then((r) =>
      setRatings(r.items),
    );
    apiFetch<PaginatedDiary>(`/users/${username}/diary`, { auth: false, query: { page_size: 10 } }).then((r) =>
      setDiary(r.items),
    );
  }, [username]);

  useEffect(() => {
    if (isOwnProfile) {
      apiFetch<ConnectedAccount[]>('/connections').then(setConnections).catch(() => setConnections([]));
    }
  }, [isOwnProfile]);

  if (!username) return <p>Log in to see your profile.</p>;
  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p>Loading…</p>;

  return (
    <div className="profile-page">
      <h1>{stats.user.display_name}</h1>
      <p className="muted">@{stats.user.username}</p>
      {stats.user.bio && <p>{stats.user.bio}</p>}

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.total_ratings}</span>
          <span className="stat-label">Ratings</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.average_score?.toFixed(2) ?? '—'}</span>
          <span className="stat-label">Avg score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.total_diary_entries}</span>
          <span className="stat-label">Diary entries</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.most_active_month ?? '—'}</span>
          <span className="stat-label">Most active month</span>
        </div>
      </section>

      <section className="top-rated-grid">
        <div>
          <h3>Highest rated albums</h3>
          <ul>
            {stats.top_rated_albums.map((a) => (
              <li key={a.album.id}>
                {a.album.title} — {a.score}★
              </li>
            ))}
            {stats.top_rated_albums.length === 0 && <li className="muted">No album ratings yet</li>}
          </ul>
        </div>
        <div>
          <h3>Highest rated tracks</h3>
          <ul>
            {stats.top_rated_tracks.map((t) => (
              <li key={t.track.id}>
                {t.track.title} — {t.score}★
              </li>
            ))}
            {stats.top_rated_tracks.length === 0 && <li className="muted">No track ratings yet</li>}
          </ul>
        </div>
        <div>
          <h3>Highest rated artists</h3>
          <ul>
            {stats.top_rated_artists.map((a) => (
              <li key={a.artist.id}>
                {a.artist.name} — {a.score}★
              </li>
            ))}
            {stats.top_rated_artists.length === 0 && <li className="muted">No artist ratings yet</li>}
          </ul>
        </div>
      </section>

      {stats.favorite_genres && (
        <section>
          <h3>Favorite genres</h3>
          <p>{stats.favorite_genres.map((g) => `${g.genre} (${g.count})`).join(' · ')}</p>
        </section>
      )}

      {isOwnProfile && (
        <>
          <ConnectionsPanel connections={connections} onChange={setConnections} />
          <SpotifyStatsPanel connections={connections} />
        </>
      )}

      <section>
        <h3>Recent diary</h3>
        <ul className="diary-list">
          {diary.map((entry) => (
            <li key={entry.id}>
              <span className="muted">{entry.listened_on}</span> —{' '}
              {entry.subject?.title ?? entry.subject?.name}
              {entry.rating && ` (${entry.rating.score}★)`}
            </li>
          ))}
          {diary.length === 0 && <li className="muted">No diary entries yet</li>}
        </ul>
      </section>

      <section>
        <h3>Top rated (all ratings)</h3>
        <ul className="rating-list">
          {ratings.map((r) => (
            <li key={r.id}>
              {r.subject_type}: {r.subject?.title ?? r.subject?.name} — {r.score}★
              {r.review && <p className="review">{r.review}</p>}
            </li>
          ))}
          {ratings.length === 0 && <li className="muted">No ratings yet</li>}
        </ul>
      </section>
    </div>
  );
}
