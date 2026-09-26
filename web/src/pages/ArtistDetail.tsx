import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import type { Artist } from '../lib/types';
import { RateWidget } from '../components/RateWidget';

export function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);

  useEffect(() => {
    if (id) apiFetch<Artist>(`/artists/${id}`, { auth: false }).then(setArtist);
  }, [id]);

  if (!artist) return <p>Loading…</p>;

  return (
    <div className="detail-page">
      {artist.image_url && <img src={artist.image_url} alt={artist.name} className="cover" />}
      <h1>{artist.name}</h1>
      {artist.genres && <p className="muted">{artist.genres.join(', ')}</p>}
      <RateWidget subjectType="artist" subjectId={artist.id} />
    </div>
  );
}
