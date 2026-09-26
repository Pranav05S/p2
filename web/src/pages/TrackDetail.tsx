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

  return (
    <div className="detail-page">
      <h1>{track.title}</h1>
      <p>
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
  );
}
