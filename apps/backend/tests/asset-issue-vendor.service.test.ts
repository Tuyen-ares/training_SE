import assert from 'node:assert/strict';
import test from 'node:test';
import type { AssetIssue, AssetIssueRepairUpdate } from '../src/models/asset-issue.model.js';
import type { AssetIssueTransaction, IAssetIssueRepository } from '../src/repositories/asset-issue.repository.js';
import { AssetIssueService } from '../src/services/asset-issue.service.js';
import { AssetIssueError } from '../src/shared/app-error.js';

function issue(overrides: Partial<AssetIssue> = {}): AssetIssue {
  return {
    id: 1,
    assetId: 10,
    reportedBy: null,
    description: 'Broken',
    status: 'CONFIRMED',
    createdAt: new Date(),
    updatedAt: new Date(),
    handledBy: null,
    vendor: null,
    startDate: null,
    endDate: null,
    cost: null,
    result: null,
    note: null,
    asset: { id: 10, serialNumber: null, status: 'DAMAGED', modelName: 'Laptop' },
    reporter: null,
    ...overrides,
  };
}

class MemoryIssueRepository implements IAssetIssueRepository {
  current = issue();
  lockedVendor: { id: number; name: string; isActive: boolean } | null = { id: 2, name: 'ABC Computer', isActive: true };
  transactionCalls = 0;

  async createConfirmed() { return this.current; }
  async createReport() { return this.current; }
  async isCurrentBorrower() { return false; }
  async findPage() { return { items: [this.current], page: 1, pageSize: 20, total: 1 }; }
  async findById() { return this.current; }
  async transition() { return true; }
  async updateRepair(_id: number, data: AssetIssueRepairUpdate) { this.current = issue({ ...this.current, vendor: data.vendorId ? this.lockedVendor : this.current.vendor }); return this.current; }
  async completeRepair() { return this.current; }
}

function createService(repository: MemoryIssueRepository) {
  const transactionPrisma = {
    async $transaction<T>(work: (transaction: AssetIssueTransaction) => Promise<T>): Promise<T> {
      repository.transactionCalls += 1;
      return work({} as AssetIssueTransaction);
    },
  } as never;
  return new AssetIssueService(
    { startRepair: async () => {}, completeRepair: async () => {} } as never,
    repository,
    { lockForAssignmentInTransaction: async () => repository.lockedVendor } as never,
    { createInTransaction: async () => repository.current } as never,
    transactionPrisma,
  );
}

test('changing vendor requires vendor.view in addition to the repair permission', async () => {
  const repository = new MemoryIssueRepository();
  const service = createService(repository);

  assert.throws(
    () => service.startRepair(1, 9, ['asset_issue.create'], { vendorId: 2 }),
    (error) => error instanceof AssetIssueError && error.code === 'VENDOR_PERMISSION_REQUIRED',
  );
  assert.equal(repository.transactionCalls, 0);
});

test('omitting vendorId preserves the current vendor without vendor.view', async () => {
  const repository = new MemoryIssueRepository();
  const service = createService(repository);

  await service.startRepair(1, 9, ['asset_issue.create'], {});
  assert.equal(repository.transactionCalls, 1);
});

test('inactive vendor is rejected when assigning a repair vendor', async () => {
  const repository = new MemoryIssueRepository();
  repository.lockedVendor = { id: 2, name: 'ABC Computer', isActive: false };
  const service = createService(repository);

  await assert.rejects(
    service.startRepair(1, 9, ['asset_issue.create', 'vendor.view'], { vendorId: 2 }),
    (error) => error instanceof AssetIssueError && error.code === 'VENDOR_INACTIVE',
  );
});
