import assert from 'node:assert/strict';
import test from 'node:test';
import { BorrowWorkflowService } from '../src/services/borrow-workflow.service.js';

test('damaged return rolls back history and asset changes when issue creation fails', async () => {
  const state = {
    history: { id: 25, detailId: 7, assetId: 11, assetStatus: 'borrowed', requesterId: 3, returnedAt: null as Date | null },
    returnCondition: null as string | null,
    assetStatus: 'borrowed',
  };
  const repository = {
    transaction: async (work: (transaction: object) => Promise<unknown>) => {
      const snapshot = structuredClone(state);
      try {
        return await work({});
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
    findHistoryForAction: async () => state.history,
    findActionDetail: async () => ({ requestId: 5 }),
    completeReturn: async () => {
      state.history.returnedAt = new Date();
      state.returnCondition = 'DAMAGED';
    },
  };
  const assets = {
    returnAsset: async () => {
      state.assetStatus = 'damaged';
    },
  };
  const assetIssues = {
    createConfirmedInTransaction: async () => {
      throw new Error('simulated issue insert failure');
    },
  };
  const events = {
    append: async () => undefined,
  };
  const prisma = {
    async $transaction<T>(work: (transaction: object) => Promise<T>): Promise<T> {
      const snapshot = structuredClone(state);
      try {
        return await work({});
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
  };
  const service = new BorrowWorkflowService(
    repository as any,
    assets as any,
    assetIssues as any,
    events as any,
    prisma as any,
  );

  await assert.rejects(
    service.returnDamaged(25, 9, 'Screen is cracked.'),
    /simulated issue insert failure/,
  );
  assert.equal(state.history.returnedAt, null);
  assert.equal(state.returnCondition, null);
  assert.equal(state.assetStatus, 'borrowed');
});

test('handover queue detail delegates to the repository', async () => {
  const expected = { requestId: 42, pendingCount: 1 };
  const repository = {
    findHandoverQueueRequest: async (requestId: number) => {
      assert.equal(requestId, 42);
      return expected;
    },
  };
  const service = new BorrowWorkflowService(
    repository as any,
    {} as any,
    {} as any,
    { append: async () => undefined } as any,
    {} as any,
  );

  assert.deepEqual(await service.getHandoverQueueDetail(42), expected);
});

test('return queue detail delegates to the repository', async () => {
  const expected = { requestId: 42, pendingCount: 2 };
  const repository = {
    findReturnQueueRequest: async (requestId: number) => {
      assert.equal(requestId, 42);
      return expected;
    },
  };
  const service = new BorrowWorkflowService(
    repository as any,
    {} as any,
    {} as any,
    { append: async () => undefined } as any,
    {} as any,
  );

  assert.deepEqual(await service.getReturnQueueDetail(42), expected);
});
