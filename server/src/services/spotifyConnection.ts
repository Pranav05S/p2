import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { refreshAccessToken } from './spotify';

export async function getValidSpotifyAccessToken(userId: string): Promise<{ accessToken: string; connectedAt: Date }> {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider: 'spotify' } },
  });
  if (!account || account.status !== 'active' || !account.accessToken) {
    throw ApiError.providerUnavailable('Spotify is not connected. Connect it via /connections/spotify/authorize first.');
  }

  const expiringSoon = !account.accessTokenExpiresAt || account.accessTokenExpiresAt.getTime() < Date.now() + 60_000;
  if (!expiringSoon) {
    return { accessToken: account.accessToken, connectedAt: account.syncSince ?? account.connectedAt };
  }

  if (!account.refreshToken) {
    await prisma.connectedAccount.update({ where: { id: account.id }, data: { status: 'needs_reauth' } });
    throw ApiError.providerUnavailable('Spotify connection expired. Reconnect via /connections/spotify/authorize.');
  }

  const refreshed = await refreshAccessToken(account.refreshToken);
  const updated = await prisma.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? account.refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      lastSyncedAt: new Date(),
    },
  });
  return { accessToken: updated.accessToken!, connectedAt: updated.syncSince ?? updated.connectedAt };
}
