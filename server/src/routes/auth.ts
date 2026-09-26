import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import { generateRefreshToken, hashToken, signAccessToken } from '../lib/jwt';
import { env } from '../lib/env';
import { requireAuth } from '../middleware/auth';
import { toPublicUser, toUser } from '../services/serializers';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
});

async function issueTokenPair(userId: string, username: string) {
  const accessToken = signAccessToken({ sub: userId, username });
  const { token: refreshToken, tokenHash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + env.refreshTokenTtlSeconds * 1000),
    },
  });
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: env.accessTokenTtlSeconds,
  };
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.username }] },
    });
    if (existing) throw ApiError.conflict('Email or username already taken');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
        displayName: body.username,
      },
    });

    const tokens = await issueTokenPair(user.id, user.username);
    res.status(201).json({ user: toUser(user), tokens });
  }),
);

const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: body.identifier }, { username: body.identifier }] },
    });
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid credentials');

    const tokens = await issueTokenPair(user.id, user.username);
    res.json({ user: toUser(user), tokens });
  }),
);

const refreshSchema = z.object({ refresh_token: z.string() });

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = refreshSchema.parse(req.body);
    const tokenHash = hashToken(body.refresh_token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const tokens = await issueTokenPair(user.id, user.username);
    res.json(tokens);
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z.object({ refresh_token: z.string().optional() }).parse(req.body ?? {});
    if (body.refresh_token) {
      const tokenHash = hashToken(body.refresh_token);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, userId: req.userId },
        data: { revokedAt: new Date() },
      });
    }
    res.status(204).send();
  }),
);
