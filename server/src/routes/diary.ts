import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { assertSubjectExists, getSubjectSummary } from '../services/subjects';
import type { DiaryEntry } from '@prisma/client';

export const diaryRouter = Router();

const createSchema = z.object({
  subject_type: z.enum(['track', 'album', 'artist']),
  subject_id: z.string().uuid(),
  listened_on: z.string().date(),
  score: z
    .number()
    .min(0.5)
    .max(5)
    .refine((v) => Math.round(v * 2) === v * 2, 'score must be in 0.5 increments')
    .optional(),
  review: z.string().max(5000).nullable().optional(),
});

export async function serializeDiaryEntry(entry: DiaryEntry) {
  const [subject, rating, listenCount] = await Promise.all([
    getSubjectSummary(entry.subjectType, entry.subjectId),
    entry.ratingId ? prisma.rating.findUnique({ where: { id: entry.ratingId } }) : null,
    prisma.diaryEntry.count({
      where: { userId: entry.userId, subjectType: entry.subjectType, subjectId: entry.subjectId },
    }),
  ]);
  return {
    id: entry.id,
    subject_type: entry.subjectType,
    subject,
    rating: rating
      ? { id: rating.id, score: rating.score, review: rating.review }
      : null,
    // How many diary entries this user has logged for this exact subject
    // (this one included) - i.e. how many times they've logged listening to it.
    listen_count: listenCount,
    listened_on: entry.listenedOn.toISOString().slice(0, 10),
    created_at: entry.createdAt.toISOString(),
  };
}

diaryRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    await assertSubjectExists(body.subject_type, body.subject_id);

    let ratingId: string | null = null;
    if (body.score !== undefined) {
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
        },
        update: { score: body.score, review: body.review ?? undefined },
      });
      ratingId = rating.id;
    }

    const entry = await prisma.diaryEntry.create({
      data: {
        userId: req.userId!,
        subjectType: body.subject_type,
        subjectId: body.subject_id,
        ratingId,
        listenedOn: new Date(body.listened_on),
      },
    });

    res.status(201).json(await serializeDiaryEntry(entry));
  }),
);

diaryRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.diaryEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Diary entry not found');
    if (existing.userId !== req.userId) throw ApiError.forbidden('Not your diary entry');
    await prisma.diaryEntry.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);
