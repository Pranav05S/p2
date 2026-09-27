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
import { MediaCard } from '../components/MediaCard';

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
      <div className="profile-header">
        <div className="profile-avatar">{stats.user.display_name[0]?.toUpperCase()}</div>
        <div>
          <h1>{stats.user.display_name}</h1>
          <p className="muted">@{stats.user.username}</p>
        </div>
      </div>
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
          <span className="stat-label">Diary</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.most_active_month ?? '—'}</span>
          <span className="stat-label">Most active</span>
        </div>
      </section>

      {stats.top_rated_albums.length > 0 && (
        <section className="section-block">
          <h3>Highest rated albums</h3>
          <div className="card-row">
            {stats.top_rated_albums.map((a) => (
              <MediaCard
                key={a.album.id}
                to={`/albums/${a.album.id}`}
                image={a.album.cover_url}
                title={a.album.title}
                badge={`${a.score}★`}
              />
            ))}
          </div>
        </section>
      )}

      {stats.top_rated_tracks.length > 0 && (
        <section className="section-block">
          <h3>Highest rated tracks</h3>
          <div className="card-row">
            {stats.top_rated_tracks.map((t) => (
              <MediaCard key={t.track.id} to={`/tracks/${t.track.id}`} title={t.track.title} badge={`${t.score}★`} />
            ))}
          </div>
        </section>
      )}

      {stats.top_rated_artists.length > 0 && (
        <section className="section-block">
          <h3>Highest rated artists</h3>
          <div className="card-row">
            {stats.top_rated_artists.map((a) => (
              <MediaCard key={a.artist.id} to={`/artists/${a.artist.id}`} title={a.artist.name} badge={`${a.score}★`} />
            ))}
          </div>
        </section>
      )}

      {stats.most_listened_tracks.length > 0 && (
        <section className="section-block">
          <h3>Most listened tracks</h3>
          <div className="card-row">
            {stats.most_listened_tracks.map((t) => (
              <MediaCard
                key={t.track.id}
                to={`/tracks/${t.track.id}`}
                title={t.track.title}
                badge={`×${t.listen_count}`}
              />
            ))}
          </div>
        </section>
      )}

      {stats.favorite_genres && (
        <section className="section-block">
          <h3>Favorite genres</h3>
          <div className="genre-pills">
            {stats.favorite_genres.map((g) => (
              <span key={g.genre} className="genre-pill">
                {g.genre} · {g.count}
              </span>
            ))}
          </div>
        </section>
      )}

      {isOwnProfile && (
        <>
          <ConnectionsPanel connections={connections} onChange={setConnections} />
          <SpotifyStatsPanel connections={connections} />
        </>
      )}

      <section className="section-block">
        <h3>Recent diary</h3>
        <ul className="diary-list">
          {diary.map((entry) => (
            <li key={entry.id}>
              <span className="muted">{entry.listened_on}</span> —{' '}
              {entry.subject?.title ?? entry.subject?.name}
              {entry.rating && ` (${entry.rating.score}★)`}
              {entry.listen_count > 1 && <span className="muted"> · listened {entry.listen_count}x</span>}
            </li>
          ))}
          {diary.length === 0 && <li className="muted">No diary entries yet</li>}
        </ul>
      </section>

      <section className="section-block">
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
