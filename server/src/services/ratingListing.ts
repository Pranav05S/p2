import type { Rating, User } from '@prisma/client';
import { toPublicUser } from './serializers';
import { getSubjectSummary } from './subjects';

export async function serializeRatingForListing(rating: Rating, user: User) {
  const subject = await getSubjectSummary(rating.subjectType, rating.subjectId);
  return {
    id: rating.id,
    user: toPublicUser(user),
    subject_type: rating.subjectType,
    subject,
    score: rating.score,
    review: rating.review,
    is_relisten: rating.isRelisten,
    created_at: rating.createdAt.toISOString(),
    updated_at: rating.updatedAt.toISOString(),
  };
}
