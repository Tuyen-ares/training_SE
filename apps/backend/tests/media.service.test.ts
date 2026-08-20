import assert from 'node:assert/strict';
import test from 'node:test';

import type { MediaFileRecord } from '../src/models/media.model.js';
import { MediaService, MEDIA_CANCEL_LIMITS } from '../src/services/media.service.js';
import { MediaError } from '../src/shared/app-error.js';

function record(overrides: Partial<MediaFileRecord> = {}): MediaFileRecord {
  return {
    id: 7,
    storage_path: 'return/example.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 3,
    purpose: 'RETURN',
    upload_status: 'PENDING',
    uploaded_by: 11,
    created_at: new Date(),
    uploaded_at: null,
    linked_at: null,
    ...overrides,
  };
}

function fixture(options: {
  row?: MediaFileRecord & { has_current_reference?: boolean };
  deleteObject?: (path: string, options?: { abortSignal?: AbortSignal }) => Promise<'DELETED' | 'NOT_FOUND'>;
  limits?: { transactionMaxWaitMs: number; transactionTimeoutMs: number; deleteTimeoutMs: number };
} = {}) {
  const deleted: number[] = [];
  const transactionOptions: unknown[] = [];
  const row = options.row ?? { ...record(), has_current_reference: false };
  const repository = {
    lockById: async () => row,
    delete: async (id: number) => { deleted.push(id); },
  };
  const storage = {
    deleteObject: options.deleteObject ?? (async () => 'DELETED' as const),
  };
  const transaction = {};
  const prisma = {
    $transaction: async (work: (value: object) => Promise<unknown>, limits: unknown) => {
      transactionOptions.push(limits);
      return work(transaction);
    },
  };
  const service = new MediaService(repository as any, storage as any, prisma as any, options.limits);
  return { service, deleted, transactionOptions };
}

test('media cancel defaults are bounded to 2s/8s/5s', () => {
  assert.deepEqual(MEDIA_CANCEL_LIMITS, {
    transactionMaxWaitMs: 2_000,
    transactionTimeoutMs: 8_000,
    deleteTimeoutMs: 5_000,
  });
});

test('cancel deletes both PENDING and READY unlinked media inside the configured transaction', async () => {
  for (const uploadStatus of ['PENDING', 'READY'] as const) {
    const current = fixture({ row: { ...record({ upload_status: uploadStatus }), has_current_reference: false } });
    await current.service.cancel(7, 11);
    assert.deepEqual(current.deleted, [7]);
    assert.deepEqual(current.transactionOptions, [{ maxWait: 2_000, timeout: 8_000 }]);
  }
});

test('cancel rejects a wrong owner and linked/reference media without touching storage row', async () => {
  const wrongOwner = fixture({ row: { ...record({ uploaded_by: 99 }), has_current_reference: false } });
  await assert.rejects(() => wrongOwner.service.cancel(7, 11), (error: unknown) => error instanceof MediaError && error.code === 'MEDIA_FORBIDDEN');
  assert.deepEqual(wrongOwner.deleted, []);

  for (const row of [
    { ...record({ linked_at: new Date() }), has_current_reference: false },
    { ...record(), has_current_reference: true },
  ]) {
    const linked = fixture({ row });
    await assert.rejects(() => linked.service.cancel(7, 11), (error: unknown) => error instanceof MediaError && error.code === 'MEDIA_ALREADY_LINKED');
    assert.deepEqual(linked.deleted, []);
  }
});

test('storage failure rolls back the row delete', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const current = fixture({ deleteObject: async () => { throw new Error('storage offline'); } });
    await assert.rejects(() => current.service.cancel(7, 11), (error: unknown) => error instanceof MediaError && error.code === 'MEDIA_STORAGE_UNAVAILABLE');
    assert.deepEqual(current.deleted, []);
  } finally {
    console.error = originalConsoleError;
  }
});

test('DeleteObject receives an abort signal and timeout abort leaves the row intact', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    let receivedSignal: AbortSignal | undefined;
    const current = fixture({
      limits: { transactionMaxWaitMs: 2, transactionTimeoutMs: 50, deleteTimeoutMs: 5 },
      deleteObject: async (_path, options) => {
        receivedSignal = options?.abortSignal;
        return new Promise((resolve, reject) => {
          options?.abortSignal?.addEventListener('abort', () => reject(options.abortSignal?.reason), { once: true });
        });
      },
    });
    await assert.rejects(() => current.service.cancel(7, 11), (error: unknown) => error instanceof MediaError && error.code === 'MEDIA_STORAGE_UNAVAILABLE');
    assert.equal(receivedSignal?.aborted, true);
    assert.deepEqual(current.deleted, []);
  } finally {
    console.error = originalConsoleError;
  }
});

test('a slow storage response below the delete timeout succeeds and releases the transaction', async () => {
  let finished = false;
  const current = fixture({
    limits: { transactionMaxWaitMs: 5, transactionTimeoutMs: 100, deleteTimeoutMs: 50 },
    deleteObject: async () => new Promise((resolve) => setTimeout(() => { finished = true; resolve('NOT_FOUND'); }, 2)),
  });
  await current.service.cancel(7, 11);
  assert.equal(finished, true);
  assert.deepEqual(current.deleted, [7]);
});
