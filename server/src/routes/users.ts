import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { toPublicUser, toUser } from '../services/serializers';
import { computeProfileStats } from '../services/profileStats';
import { serializeDiaryEntry } from './diary';
import { serializeRatingForListing } from '../services/ratingListing';

export const usersRouter = Router();

usersRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    res.json(toUser(user));
  }),
);

const patchMeSchema = z.object({
  display_name: z.string().min(1).max(60).optional(),
  bio: z.string().max(280).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

usersRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = patchMeSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { displayName: body.display_name, bio: body.bio, avatarUrl: body.avatar_url },
    });
    res.json(toUser(user));
  }),
);

async function findUserByUsername(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

usersRouter.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const user = await findUserByUsername(req.params.username);
    res.json(toPublicUser(user));
  }),
);

usersRouter.get(
  '/:username/stats',
  asyncHandler(async (req, res) => {
    const user = await findUserByUsername(req.params.username);
    const stats = await computeProfileStats(user.id);
    res.json({ user: toPublicUser(user), ...stats });
  }),
);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

usersRouter.get(
  '/:username/ratings',
  asyncHandler(async (req, res) => {
    const user = await findUserByUsername(req.params.username);
    const query = z
      .object({
        subject_type: z.enum(['track', 'album', 'artist']).optional(),
        sort: z.enum(['recent', 'highest', 'lowest']).default('recent'),
      })
      .merge(paginationSchema)
      .parse(req.query);

    const orderBy =
      query.sort === 'highest'
        ? [{ score: 'desc' as const }, { createdAt: 'desc' as const }]
        : query.sort === 'lowest'
          ? [{ score: 'asc' as const }, { createdAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

    const where = { userId: user.id, subjectType: query.subject_type };
    const [total, ratings] = await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
    ]);

    res.json({
      items: await Promise.all(ratings.map((r) => serializeRatingForListing(r, user))),
      page: query.page,
      page_size: query.page_size,
      total,
    });
  }),
);

usersRouter.get(
  '/:username/diary',
  asyncHandler(async (req, res) => {
    const user = await findUserByUsername(req.params.username);
    const query = z
      .object({
        from: z.string().date().optional(),
        to: z.string().date().optional(),
      })
      .merge(paginationSchema)
      .parse(req.query);

    const where = {
      userId: user.id,
      listenedOn: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };
    const [total, entries] = await Promise.all([
      prisma.diaryEntry.count({ where }),
      prisma.diaryEntry.findMany({
        where,
        orderBy: { listenedOn: 'desc' },
        skip: (query.page - 1) * query.page_size,
        take: query.page_size,
      }),
    ]);

    res.json({
      items: await Promise.all(entries.map(serializeDiaryEntry)),
      page: query.page,
      page_size: query.page_size,
      total,
    });
  }),
);
