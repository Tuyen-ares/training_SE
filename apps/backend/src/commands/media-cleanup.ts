import 'dotenv/config';
import { Prisma } from '../../generated/prisma/index.js';
import prisma from '@/prisma.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';
import { requireMediaConfig } from '@/shared/media-config.js';

type CleanupKind = 'STALE_PENDING' | 'NEVER_LINKED_READY' | 'DETACHED_REPLACEMENT';

type MediaCandidate = {
  id: number;
  storage_path: string;
  upload_status: 'pending' | 'ready';
  created_at: Date;
  linked_at: Date | null;
  asset_image: unknown;
  user_avatar: unknown;
  handover_evidence: unknown;
  return_evidence: unknown;
  repair_evidence: unknown;
};

function hasCurrentReference(row: MediaCandidate): boolean {
  return Boolean(
    row.asset_image ||
    row.user_avatar ||
    row.handover_evidence ||
    row.return_evidence ||
    row.repair_evidence,
  );
}

function classify(row: MediaCandidate, now: Date): CleanupKind | null {
  const ageMs = now.getTime() - row.created_at.getTime();
  if (row.upload_status === 'pending' && ageMs >= 15 * 60 * 1000) return 'STALE_PENDING';
  if (
    row.upload_status === 'ready' &&
    row.linked_at === null &&
    ageMs >= 24 * 60 * 60 * 1000 &&
    !hasCurrentReference(row)
  ) {
    return 'NEVER_LINKED_READY';
  }
  if (row.upload_status === 'ready' && row.linked_at !== null && !hasCurrentReference(row)) {
    return 'DETACHED_REPLACEMENT';
  }
  return null;
}

async function findCandidates(): Promise<Array<{ row: MediaCandidate; kind: CleanupKind }>> {
  const rows = await prisma.media_files.findMany({
    where: {
      upload_status: { in: ['pending', 'ready'] },
    },
    include: {
      asset_image: { select: { id: true } },
      user_avatar: { select: { id: true } },
      handover_evidence: { select: { media_file_id: true } },
      return_evidence: { select: { media_file_id: true } },
      repair_evidence: { select: { media_file_id: true } },
    },
    orderBy: { id: 'asc' },
  });
  const now = new Date();
  return rows.flatMap((row) => {
    const candidateRow = row as unknown as MediaCandidate;
    const kind = classify(candidateRow, now);
    return kind ? [{ row: candidateRow, kind }] : [];
  });
}

async function executeCandidate(candidate: { row: MediaCandidate; kind: CleanupKind }, storage: S3MediaStorage): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: number }>>(
      Prisma.sql`SELECT id FROM media_files WHERE id = ${candidate.row.id} FOR UPDATE`,
    );
    if (!locked[0]) return false;

    const row = await transaction.media_files.findUnique({
      where: { id: candidate.row.id },
      include: {
        asset_image: { select: { id: true } },
        user_avatar: { select: { id: true } },
        handover_evidence: { select: { media_file_id: true } },
        return_evidence: { select: { media_file_id: true } },
        repair_evidence: { select: { media_file_id: true } },
      },
    });
    if (!row) return false;
    const currentKind = classify(row as unknown as MediaCandidate, new Date());
    if (currentKind !== candidate.kind) return false;

    const deleted = await storage.deleteObject(row.storage_path);
    if (deleted !== 'DELETED' && deleted !== 'NOT_FOUND') return false;
    await transaction.media_files.delete({ where: { id: row.id } });
    return true;
  });
}

async function run(): Promise<void> {
  requireMediaConfig();
  const execute = process.argv.includes('--execute');
  const storage = new S3MediaStorage();
  const candidates = await findCandidates();
  for (const candidate of candidates) {
    if (!execute) {
      console.log(JSON.stringify({ mode: 'dry-run', kind: candidate.kind, mediaId: candidate.row.id }));
      continue;
    }
    try {
      const removed = await executeCandidate(candidate, storage);
      console.log(JSON.stringify({ mode: 'execute', kind: candidate.kind, mediaId: candidate.row.id, removed }));
    } catch (error) {
      console.error(JSON.stringify({ mode: 'execute', kind: candidate.kind, mediaId: candidate.row.id, removed: false, error: error instanceof Error ? error.name : 'UNKNOWN_ERROR' }));
    }
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Media cleanup failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
