export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface PublicUser {
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface ArtistSummary {
  id: string;
  name: string;
}

export interface AlbumSummary {
  id: string;
  title: string;
  cover_url: string | null;
}

export interface Artist extends ArtistSummary {
  image_url: string | null;
  genres: string[] | null;
  external_ids: Record<string, string>;
}

export interface Album extends AlbumSummary {
  artist: ArtistSummary;
  release_date: string | null;
  external_ids: Record<string, string>;
}

export interface AlbumWithTracks extends Album {
  tracks: Track[];
}

export interface Track {
  id: string;
  title: string;
  album: AlbumSummary | null;
  artist: ArtistSummary;
  duration_ms: number;
  track_number: number | null;
  external_ids: Record<string, string>;
}

export type SubjectType = 'track' | 'album' | 'artist';

export interface RatingSubject {
  id: string;
  name?: string;
  title?: string;
  cover_url?: string | null;
}

export interface Rating {
  id: string;
  user: PublicUser;
  subject_type: SubjectType;
  subject: RatingSubject | null;
  score: number;
  review: string | null;
  is_relisten: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntry {
  id: string;
  subject_type: SubjectType;
  subject: RatingSubject | null;
  rating: { id: string; score: number; review: string | null } | null;
  listened_on: string;
  created_at: string;
}

export interface ProfileStats {
  user: PublicUser;
  total_ratings: number;
  total_diary_entries: number;
  average_score: number | null;
  ratings_distribution: Record<string, number>;
  top_rated_albums: { album: AlbumSummary; score: number }[];
  top_rated_tracks: { track: { id: string; title: string }; score: number }[];
  top_rated_artists: { artist: ArtistSummary; score: number }[];
  favorite_genres: { genre: string; count: number }[] | null;
  most_active_month: string | null;
}

export interface ConnectedAccount {
  id: string;
  provider: string;
  status: string;
  scopes: string[];
  connected_at: string;
  last_synced_at: string | null;
}

export interface SearchResults {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
}

export type RangeParam = 'short_term' | 'medium_term' | 'long_term';

export interface TopItemsResponse {
  provider: string;
  range: string;
  generated_at: string;
  items: {
    rank: number;
    artist: ArtistSummary | null;
    track: { id: string; title: string; artist: ArtistSummary } | null;
  }[];
}

export interface ListeningTimeEstimate {
  provider: string;
  range: string;
  estimated_ms: number;
  coverage_start: string;
  coverage_end: string;
  note: string;
}

export interface PaginatedRatings {
  items: Rating[];
  page: number;
  page_size: number;
  total: number;
}

export interface PaginatedDiary {
  items: DiaryEntry[];
  page: number;
  page_size: number;
  total: number;
}
