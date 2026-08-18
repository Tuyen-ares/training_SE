import 'dotenv/config';
import prisma from '@/prisma.js';
import { S3MediaStorage } from '@/services/media-storage.service.js';
import { requireMediaConfig, MEDIA_CACHE_CONTROL } from '@/shared/media-config.js';

async function run(): Promise<void> {
  requireMediaConfig();
  const storage = new S3MediaStorage();
  const rows = await prisma.media_files.findMany({
    where: {
      OR: [
        { asset_image: { isNot: null } },
        { user_avatar: { isNot: null } },
        { handover_evidence: { isNot: null } },
        { return_evidence: { isNot: null } },
        { repair_evidence: { isNot: null } },
      ],
    },
    select: {
      id: true,
      storage_path: true,
      mime_type: true,
      size_bytes: true,
      upload_status: true,
      uploaded_at: true,
    },
    orderBy: { id: 'asc' },
  });

  for (const row of rows) {
    try {
      const head = await storage.headObject(row.storage_path);
      const metadataMatches =
        head.contentLength === row.size_bytes &&
        head.contentType === row.mime_type &&
        head.cacheControl === MEDIA_CACHE_CONTROL;
      console.log(JSON.stringify({ mediaId: row.id, status: metadataMatches ? 'OK' : 'METADATA_MISMATCH' }));
    } catch (error) {
      console.log(JSON.stringify({ mediaId: row.id, status: 'HEAD_FAILED', error: error instanceof Error ? error.name : 'UNKNOWN_ERROR' }));
    }
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Media audit failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
