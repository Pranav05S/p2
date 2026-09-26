import { useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import type { SearchResults } from '../lib/types';
import { RateWidget } from '../components/RateWidget';
import { MediaCard } from '../components/MediaCard';

export function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<SearchResults>('/search', { query: { q }, auth: false });
      setResults(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.message}${err.code === 'upstream_error' ? ' (catalog search needs Spotify API credentials configured on the server)' : ''}`
          : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="search-page">
      <h1>Find something to rate</h1>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists, albums, tracks…"
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {results && (
        <div className="search-results">
          {results.artists.length > 0 && (
            <section>
              <h2>Artists</h2>
              <div className="card-grid">
                {results.artists.map((artist) => (
                  <MediaCard
                    key={artist.id}
                    to={`/artists/${artist.id}`}
                    image={artist.image_url}
                    title={artist.name}
                    subtitle={artist.genres?.[0]}
                  >
                    <RateWidget subjectType="artist" subjectId={artist.id} />
                  </MediaCard>
                ))}
              </div>
            </section>
          )}
          {results.albums.length > 0 && (
            <section>
              <h2>Albums</h2>
              <div className="card-grid">
                {results.albums.map((album) => (
                  <MediaCard
                    key={album.id}
                    to={`/albums/${album.id}`}
                    image={album.cover_url}
                    title={album.title}
                    subtitle={album.artist.name}
                  >
                    <RateWidget subjectType="album" subjectId={album.id} />
                  </MediaCard>
                ))}
              </div>
            </section>
          )}
          {results.tracks.length > 0 && (
            <section>
              <h2>Tracks</h2>
              <div className="card-grid">
                {results.tracks.map((track) => (
                  <MediaCard
                    key={track.id}
                    to={`/tracks/${track.id}`}
                    image={track.album?.cover_url}
                    title={track.title}
                    subtitle={track.artist.name}
                  >
                    <RateWidget subjectType="track" subjectId={track.id} />
                  </MediaCard>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
