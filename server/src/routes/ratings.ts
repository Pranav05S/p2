import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { assertSubjectExists } from '../services/subjects';
import { serializeRatingForListing } from '../services/ratingListing';
import type { Rating } from '@prisma/client';

export const ratingsRouter = Router();

const scoreSchema = z
  .number()
  .min(0.5)
  .max(5)
  .refine((v) => Math.round(v * 2) === v * 2, 'score must be in 0.5 increments');

const createSchema = z.object({
  subject_type: z.enum(['track', 'album', 'artist']),
  subject_id: z.string().uuid(),
  score: scoreSchema,
  review: z.string().max(5000).nullable().optional(),
  is_relisten: z.boolean().optional(),
});

async function serializeRating(rating: Rating) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: rating.userId } });
  return serializeRatingForListing(rating, user);
}

ratingsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    await assertSubjectExists(body.subject_type, body.subject_id);

    const rating = await prisma.rating.upsert({
      where: {
        userId_subjectType_subjectId: {
          userId: req.userId!,
          subjectType: body.subject_type,
          subjectId: body.subject_id,
        },
      },
      create: {
        userId: req.userId!,
        subjectType: body.subject_type,
        subjectId: body.subject_id,
        score: body.score,
        review: body.review ?? null,
        isRelisten: body.is_relisten ?? false,
      },
      update: {
        score: body.score,
        review: body.review ?? null,
        isRelisten: body.is_relisten ?? false,
      },
    });

    res.status(201).json(await serializeRating(rating));
  }),
);

ratingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rating = await prisma.rating.findUnique({ where: { id: req.params.id } });
    if (!rating) throw ApiError.notFound('Rating not found');
    res.json(await serializeRating(rating));
  }),
);

const patchSchema = z.object({
  score: scoreSchema.optional(),
  review: z.string().max(5000).nullable().optional(),
});

ratingsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = patchSchema.parse(req.body);
    const existing = await prisma.rating.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Rating not found');
    if (existing.userId !== req.userId) throw ApiError.forbidden('Not your rating');

    const updated = await prisma.rating.update({
      where: { id: existing.id },
      data: { score: body.score, review: body.review },
    });
    res.json(await serializeRating(updated));
  }),
);

ratingsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.rating.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Rating not found');
    if (existing.userId !== req.userId) throw ApiError.forbidden('Not your rating');
    await prisma.rating.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);
