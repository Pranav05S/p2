import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { toConnectedAccount } from '../services/serializers';
import { signOAuthState, verifyOAuthState } from '../lib/oauthState';
import { buildAuthorizeUrl, exchangeCodeForToken, getMe, SPOTIFY_SCOPES } from '../services/spotify';
import { env } from '../lib/env';

export const connectionsRouter = Router();

const providerParam = z.enum(['spotify', 'apple_music', 'amazon_music', 'youtube_music']);

connectionsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const accounts = await prisma.connectedAccount.findMany({ where: { userId: req.userId! } });
    res.json(accounts.map(toConnectedAccount));
  }),
);

connectionsRouter.get(
  '/:provider/authorize',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = providerParam.parse(req.params.provider);
    if (provider !== 'spotify') {
      throw ApiError.providerUnavailable(
        `${provider} is not yet integrated. See openapi.yaml for current per-provider capabilities.`,
      );
    }
    const state = signOAuthState(req.userId!);
    res.json({ authorization_url: buildAuthorizeUrl(state), state });
  }),
);

connectionsRouter.get(
  '/:provider/callback',
  asyncHandler(async (req, res) => {
    const provider = providerParam.parse(req.params.provider);
    const { code, state, error } = req.query as Record<string, string | undefined>;

    if (error || !code || !state) {
      return res.redirect(`${env.appBaseUrl}/settings/connections?error=${encodeURIComponent(error ?? 'missing_code')}`);
    }

    let userId: string;
    try {
      userId = verifyOAuthState(state);
    } catch {
      return res.redirect(`${env.appBaseUrl}/settings/connections?error=invalid_state`);
    }

    if (provider !== 'spotify') {
      return res.redirect(`${env.appBaseUrl}/settings/connections?error=unsupported_provider`);
    }

    const tokenResponse = await exchangeCodeForToken(code);
    const me = await getMe(tokenResponse.access_token);

    await prisma.connectedAccount.upsert({
      where: { userId_provider: { userId, provider: 'spotify' } },
      create: {
        userId,
        provider: 'spotify',
        status: 'active',
        providerUserId: me.id,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        accessTokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        scopes: SPOTIFY_SCOPES,
        syncSince: new Date(),
      },
      update: {
        status: 'active',
        providerUserId: me.id,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? undefined,
        accessTokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        scopes: SPOTIFY_SCOPES,
      },
    });

    res.redirect(`${env.appBaseUrl}/settings/connections?connected=spotify`);
  }),
);

connectionsRouter.delete(
  '/:provider',
  requireAuth,
  asyncHandler(async (req, res) => {
    const provider = providerParam.parse(req.params.provider);
    await prisma.connectedAccount.deleteMany({ where: { userId: req.userId!, provider } });
    res.status(204).send();
  }),
);
