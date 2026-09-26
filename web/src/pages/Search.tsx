import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, ApiError } from '../lib/api';
import type { SearchResults } from '../lib/types';
import { RateWidget } from '../components/RateWidget';

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
      <h1>Search</h1>
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
              <ul className="result-list">
                {results.artists.map((artist) => (
                  <li key={artist.id}>
                    <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                    <RateWidget subjectType="artist" subjectId={artist.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.albums.length > 0 && (
            <section>
              <h2>Albums</h2>
              <ul className="result-list">
                {results.albums.map((album) => (
                  <li key={album.id}>
                    <Link to={`/albums/${album.id}`}>
                      {album.title} — <span className="muted">{album.artist.name}</span>
                    </Link>
                    <RateWidget subjectType="album" subjectId={album.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.tracks.length > 0 && (
            <section>
              <h2>Tracks</h2>
              <ul className="result-list">
                {results.tracks.map((track) => (
                  <li key={track.id}>
                    <Link to={`/tracks/${track.id}`}>
                      {track.title} — <span className="muted">{track.artist.name}</span>
                    </Link>
                    <RateWidget subjectType="track" subjectId={track.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
