import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import type { ConnectedAccount, ListeningTimeEstimate, RangeParam, TopItemsResponse } from '../lib/types';

const RANGE_LABELS: Record<RangeParam, string> = {
  short_term: 'Last 4 weeks',
  medium_term: 'Last 6 months',
  long_term: 'All time',
};

interface Props {
  connections: ConnectedAccount[];
}

export function SpotifyStatsPanel({ connections }: Props) {
  const connected = connections.some((c) => c.provider === 'spotify' && c.status === 'active');
  const [range, setRange] = useState<RangeParam>('medium_term');
  const [topArtists, setTopArtists] = useState<TopItemsResponse | null>(null);
  const [topTracks, setTopTracks] = useState<TopItemsResponse | null>(null);
  const [listeningTime, setListeningTime] = useState<ListeningTimeEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    setError(null);
    const query = { provider: 'spotify', range };
    Promise.all([
      apiFetch<TopItemsResponse>('/users/me/stats/top-artists', { query }),
      apiFetch<TopItemsResponse>('/users/me/stats/top-tracks', { query }),
      apiFetch<ListeningTimeEstimate>('/users/me/stats/listening-time', { query }),
    ])
      .then(([artists, tracks, time]) => {
        setTopArtists(artists);
        setTopTracks(tracks);
        setListeningTime(time);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load Spotify stats'));
  }, [connected, range]);

  if (!connected) return null;

  return (
    <section className="spotify-stats-panel">
      <h3>Spotify listening stats</h3>
      <div className="range-select">
        {(Object.keys(RANGE_LABELS) as RangeParam[]).map((r) => (
          <button key={r} className={r === range ? 'active' : ''} onClick={() => setRange(r)}>
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}

      <div className="top-rated-grid">
        <div>
          <h4>Top artists</h4>
          <ol>
            {topArtists?.items.map((item) => <li key={item.rank}>{item.artist?.name}</li>)}
          </ol>
        </div>
        <div>
          <h4>Top tracks</h4>
          <ol>
            {topTracks?.items.map((item) => (
              <li key={item.rank}>
                {item.track?.title} — <span className="muted">{item.track?.artist.name}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {listeningTime && (
        <p className="listening-time">
          Estimated listening time since connecting:{' '}
          <strong>{Math.round(listeningTime.estimated_ms / 60000)} min</strong>
          <br />
          <span className="hint">{listeningTime.note}</span>
        </p>
      )}
    </section>
  );
}
