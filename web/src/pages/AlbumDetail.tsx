import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import type { AlbumWithTracks } from '../lib/types';
import { RateWidget } from '../components/RateWidget';

export function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumWithTracks | null>(null);

  useEffect(() => {
    if (id) apiFetch<AlbumWithTracks>(`/albums/${id}`, { auth: false }).then(setAlbum);
  }, [id]);

  if (!album) return <p>Loading…</p>;

  return (
    <div className="detail-page">
      {album.cover_url && <img src={album.cover_url} alt={album.title} className="cover" />}
      <h1>{album.title}</h1>
      <p>
        by <Link to={`/artists/${album.artist.id}`}>{album.artist.name}</Link>
        {album.release_date && ` · ${album.release_date.slice(0, 4)}`}
      </p>
      <RateWidget subjectType="album" subjectId={album.id} />
      <h2>Tracks</h2>
      <ol className="track-list">
        {album.tracks.map((track) => (
          <li key={track.id}>
            <Link to={`/tracks/${track.id}`}>{track.title}</Link>
            <RateWidget subjectType="track" subjectId={track.id} />
          </li>
        ))}
      </ol>
    </div>
  );
}
