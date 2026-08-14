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
  const notifications = {
    createInTransaction: async () => ({}),
    notifyPermissionHoldersInTransaction: async () => 0,
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
    notifications as any,
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
