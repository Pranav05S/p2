import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { toAlbumSummary, toArtistSummary } from './serializers';

export type SubjectType = 'artist' | 'album' | 'track';

export async function assertSubjectExists(subjectType: SubjectType, subjectId: string): Promise<void> {
  const exists =
    subjectType === 'artist'
      ? await prisma.artist.findUnique({ where: { id: subjectId } })
      : subjectType === 'album'
        ? await prisma.album.findUnique({ where: { id: subjectId } })
        : await prisma.track.findUnique({ where: { id: subjectId } });
  if (!exists) throw ApiError.badRequest(`${subjectType} ${subjectId} does not exist in the catalog`);
}

export async function getSubjectSummary(subjectType: SubjectType, subjectId: string) {
  if (subjectType === 'artist') {
    const artist = await prisma.artist.findUnique({ where: { id: subjectId } });
    return artist ? toArtistSummary(artist) : null;
  }
  if (subjectType === 'album') {
    const album = await prisma.album.findUnique({ where: { id: subjectId } });
    return album ? toAlbumSummary(album) : null;
  }
  const track = await prisma.track.findUnique({ where: { id: subjectId } });
  return track ? { id: track.id, title: track.title } : null;
}
