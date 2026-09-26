import axios from 'axios';
import crypto from 'crypto';
import { env } from '../lib/env';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

export const SPOTIFY_SCOPES = ['user-top-read', 'user-read-recently-played', 'user-read-email'];

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.spotify.clientId,
    scope: SPOTIFY_SCOPES.join(' '),
    redirect_uri: env.spotify.redirectUri,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const basic = Buffer.from(`${env.spotify.clientId}:${env.spotify.clientSecret}`).toString('base64');
  const { data } = await axios.post<TokenResponse>(
    TOKEN_URL,
    new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: env.spotify.redirectUri }),
    { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const basic = Buffer.from(`${env.spotify.clientId}:${env.spotify.clientSecret}`).toString('base64');
  const { data } = await axios.post<TokenResponse>(
    TOKEN_URL,
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  return data;
}

function client(accessToken: string) {
  return axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${accessToken}` } });
}

// Catalog browsing (search/lookup) is public data - use an app-level Client
// Credentials token rather than requiring every visitor to link Spotify.
let appToken: { token: string; expiresAt: number } | null = null;

export async function getAppAccessToken(): Promise<string> {
  if (appToken && appToken.expiresAt > Date.now() + 30_000) return appToken.token;
  const basic = Buffer.from(`${env.spotify.clientId}:${env.spotify.clientSecret}`).toString('base64');
  const { data } = await axios.post<TokenResponse>(
    TOKEN_URL,
    new URLSearchParams({ grant_type: 'client_credentials' }),
    { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  appToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return appToken.token;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  release_date: string;
  artists: SpotifyArtist[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
}

export async function search(accessToken: string, q: string, types: string[], limit: number) {
  const { data } = await client(accessToken).get('/search', {
    params: { q, type: types.join(','), limit },
  });
  return data;
}

export async function getTopItems(
  accessToken: string,
  type: 'artists' | 'tracks',
  range: string,
  limit = 20,
) {
  const { data } = await client(accessToken).get(`/me/top/${type}`, {
    params: { time_range: range, limit },
  });
  return data.items as (SpotifyArtist | SpotifyTrack)[];
}

export interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

export async function getRecentlyPlayed(accessToken: string, afterMs?: number, limit = 50) {
  const { data } = await client(accessToken).get('/me/player/recently-played', {
    params: { limit, ...(afterMs ? { after: afterMs } : {}) },
  });
  return data.items as RecentlyPlayedItem[];
}

export async function getMe(accessToken: string) {
  const { data } = await client(accessToken).get('/me');
  return data as { id: string; email: string };
}
