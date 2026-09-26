import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import type { Track } from '../lib/types';
import { RateWidget } from '../components/RateWidget';

export function TrackDetail() {
  const { id } = useParams<{ id: string }>();
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (id) apiFetch<Track>(`/tracks/${id}`, { auth: false }).then(setTrack);
  }, [id]);

  if (!track) return <p>Loading…</p>;

  const cover = track.album?.cover_url;

  return (
    <div className="detail-page">
      <div className="detail-hero">
        {cover && <div className="detail-hero-backdrop" style={{ backgroundImage: `url(${cover})` }} />}
        {cover ? (
          <img src={cover} alt={track.title} className="cover" />
        ) : (
          <div className="cover-placeholder" style={{ background: 'var(--accent-gradient)' }}>
            {track.title[0]}
          </div>
        )}
        <div className="detail-hero-info">
          <h1>{track.title}</h1>
          <p className="muted">
            by <Link to={`/artists/${track.artist.id}`}>{track.artist.name}</Link>
            {track.album && (
              <>
                {' '}
                on <Link to={`/albums/${track.album.id}`}>{track.album.title}</Link>
              </>
            )}
          </p>
          <RateWidget subjectType="track" subjectId={track.id} />
        </div>
      </div>
    </div>
  );
}
