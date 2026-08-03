import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AssetTransaction,
  CreateAssetData,
  IAssetRepository,
} from '../src/repositories/asset.repository.js';
import type {
  Asset,
  AssetStatus,
  UpdateAssetDto,
} from '../src/models/asset.model.js';
import { AssetService } from '../src/services/assets.service.js';
import {
  ConflictError,
  InvalidStateTransitionError,
} from '../src/shared/app-error.js';

const transaction = {} as AssetTransaction;

function makeAsset(id: number, status: AssetStatus = 'available'): Asset {
  return {
    id,
    asset_model_id: 1,
    serial_number: `SERIAL-${id}`,
    status,
    qr_code: `00000000-0000-4000-8000-${id.toString().padStart(12, '0')}`,
    created_at: new Date('2026-01-01T00:00:00Z'),
  };
}

class MemoryAssetRepository implements IAssetRepository {
  readonly assets = new Map<number, Asset>();
  readonly assetModelIds = new Set([1]);
  private nextId = 100;

  constructor(initialAssets: Asset[] = []) {
    for (const asset of initialAssets) {
      this.assets.set(asset.id, structuredClone(asset));
    }
  }

  async findAll(): Promise<Asset[]> {
    return [...this.assets.values()].map((asset) => structuredClone(asset));
  }

  async findById(id: number): Promise<Asset | null> {
    const asset = this.assets.get(id);
    return asset ? structuredClone(asset) : null;
  }

  async create(data: CreateAssetData): Promise<Asset> {
    const asset: Asset = {
      id: this.nextId++,
      ...data,
      created_at: new Date(),
    };
    this.assets.set(asset.id, structuredClone(asset));
    return structuredClone(asset);
  }

  async update(id: number, data: UpdateAssetDto): Promise<Asset> {
    const current = this.assets.get(id);
    if (!current) throw new Error('Asset not found');
    const updated = { ...current, ...data };
    this.assets.set(id, updated);
    return structuredClone(updated);
  }

  async findBySerialNumber(serialNumber: string): Promise<Asset | null> {
    const asset = [...this.assets.values()].find(
      (candidate) => candidate.serial_number === serialNumber,
    );
    return asset ? structuredClone(asset) : null;
  }

  async assetModelExists(assetModelId: number): Promise<boolean> {
    return this.assetModelIds.has(assetModelId);
  }

  async transitionStatus(
    assetIds: number[],
    expectedStatus: AssetStatus,
    nextStatus: AssetStatus,
  ): Promise<number> {
    let updatedCount = 0;

    // The status predicate and update happen in one synchronous operation here,
    // mirroring the single conditional UPDATE used by Prisma.
    for (const id of assetIds) {
      const asset = this.assets.get(id);
      if (asset?.status !== expectedStatus) continue;
      this.assets.set(id, { ...asset, status: nextStatus });
      updatedCount += 1;
    }

    return updatedCount;
  }
}

test('create validates model and serial before creating an available asset', async () => {
  const repository = new MemoryAssetRepository([makeAsset(1)]);
  const service = new AssetService(repository);

  assert.deepEqual(
    await service.create({ asset_model_id: 999 }),
    { error: 'Asset model does not exist' },
  );
  assert.deepEqual(
    await service.create({
      asset_model_id: 1,
      serial_number: 'SERIAL-1',
    }),
    { error: 'Serial number already exists' },
  );

  const result = await service.create({
    asset_model_id: 1,
    serial_number: 'SERIAL-NEW',
  });

  assert.equal(result.error, undefined);
  assert.equal(result.data?.status, 'available');
  assert.equal(result.data?.serial_number, 'SERIAL-NEW');
  assert.match(result.data?.qr_code ?? '', /^[0-9a-f-]{36}$/i);
});

test('update rejects an invalid model and another asset serial number', async () => {
  const repository = new MemoryAssetRepository([makeAsset(1), makeAsset(2)]);
  const service = new AssetService(repository);

  await assert.rejects(
    service.update(1, { asset_model_id: 999 }),
    (error) =>
      error instanceof ConflictError &&
      error.message === 'Asset model does not exist',
  );
  await assert.rejects(
    service.update(1, { serial_number: 'SERIAL-2' }),
    (error) =>
      error instanceof ConflictError &&
      error.message === 'Serial number already exists',
  );

  const updated = await service.update(1, { serial_number: 'SERIAL-UPDATED' });
  assert.equal(updated?.serial_number, 'SERIAL-UPDATED');
  assert.equal(await service.update(999, { serial_number: 'UNKNOWN' }), null);
});

test('retire only permits available or damaged assets', async () => {
  const repository = new MemoryAssetRepository([
    makeAsset(1, 'available'),
    makeAsset(2, 'damaged'),
    makeAsset(3, 'reserved'),
    makeAsset(4, 'borrowed'),
    makeAsset(5, 'in_repair'),
    makeAsset(6, 'retired'),
  ]);
  const service = new AssetService(repository);

  assert.equal(await service.retire(1), true);
  assert.equal(await service.retire(2), true);
  assert.equal((await repository.findById(1))?.status, 'retired');
  assert.equal((await repository.findById(2))?.status, 'retired');
  assert.equal(await service.retire(999), false);

  for (const id of [3, 4, 5, 6]) {
    await assert.rejects(
      service.retire(id),
      (error) => error instanceof InvalidStateTransitionError,
    );
  }
});

test('approval, handover, cancellation, and return follow the asset lifecycle', async () => {
  const repository = new MemoryAssetRepository([
    makeAsset(1, 'available'),
    makeAsset(2, 'available'),
  ]);
  const service = new AssetService(repository);

  await service.reserveForApprovedRequest([1, 2], transaction);
  assert.equal((await repository.findById(1))?.status, 'reserved');
  assert.equal((await repository.findById(2))?.status, 'reserved');

  await service.cancelApprovedRequest([1], transaction);
  assert.equal((await repository.findById(1))?.status, 'available');

  await service.confirmHandover([2], transaction);
  assert.equal((await repository.findById(2))?.status, 'borrowed');

  await service.returnAsset(2, 'good', transaction);
  assert.equal((await repository.findById(2))?.status, 'available');

  await service.reserveForApprovedRequest([2], transaction);
  await service.confirmHandover([2], transaction);
  await service.returnAsset(2, 'damaged', transaction);
  assert.equal((await repository.findById(2))?.status, 'damaged');
});

test('damage and repair lifecycle supports success and failure', async () => {
  const repository = new MemoryAssetRepository([
    makeAsset(1, 'available'),
    makeAsset(2, 'in_repair'),
  ]);
  const service = new AssetService(repository);

  assert.equal(await service.reportDamaged(1), true);
  assert.equal((await repository.findById(1))?.status, 'damaged');

  await service.startRepair(1, transaction);
  await service.completeRepair(1, 'repaired', transaction);
  assert.equal((await repository.findById(1))?.status, 'available');

  await service.completeRepair(2, 'failed', transaction);
  assert.equal((await repository.findById(2))?.status, 'damaged');
  assert.equal(await service.reportDamaged(999), false);
});

test('invalid transitions and an empty asset set are rejected', async () => {
  const repository = new MemoryAssetRepository([
    makeAsset(1, 'borrowed'),
    makeAsset(2, 'available'),
  ]);
  const service = new AssetService(repository);

  await assert.rejects(
    service.reserveForApprovedRequest([], transaction),
    (error) => error instanceof ConflictError,
  );
  await assert.rejects(
    service.reserveForApprovedRequest([1], transaction),
    (error) => error instanceof InvalidStateTransitionError,
  );
  await assert.rejects(
    service.confirmHandover([2], transaction),
    (error) => error instanceof InvalidStateTransitionError,
  );
  await assert.rejects(
    service.reserveForApprovedRequest([2, 999], transaction),
    (error) => error instanceof InvalidStateTransitionError,
  );
});

test('two concurrent approvals of one asset allow exactly one reservation', async () => {
  const repository = new MemoryAssetRepository([makeAsset(1, 'available')]);
  const service = new AssetService(repository);

  const results = await Promise.allSettled([
    service.reserveForApprovedRequest([1], transaction),
    service.reserveForApprovedRequest([1], transaction),
  ]);

  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    results.filter(
      (result) =>
        result.status === 'rejected' &&
        result.reason instanceof InvalidStateTransitionError,
    ).length,
    1,
  );
  assert.equal((await repository.findById(1))?.status, 'reserved');
});
