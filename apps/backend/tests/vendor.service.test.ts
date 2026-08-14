import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CreateVendorDto,
  UpdateVendorDto,
  Vendor,
  VendorListQuery,
  VendorPage,
} from '../src/models/vendor.model.js';
import type { IVendorRepository } from '../src/repositories/vendor.repository.js';
import { VendorService } from '../src/services/vendor.service.js';
import { ConflictError } from '../src/shared/app-error.js';
import type { PrismaTransaction } from '../src/shared/prisma-transaction.js';

function vendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: 1,
    name: 'ABC Computer',
    contactName: null,
    phone: null,
    email: null,
    address: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

class MemoryVendorRepository implements IVendorRepository {
  readonly records = new Map<number, Vendor>([[1, vendor()]]);
  lastCreate: CreateVendorDto | null = null;
  lastUpdate: UpdateVendorDto | null = null;

  async findPage(query: VendorListQuery): Promise<VendorPage> {
    const items = [...this.records.values()].filter((item) =>
      (!query.q || item.name.includes(query.q)) &&
      (query.isActive === undefined || item.isActive === query.isActive));
    return { items, page: query.page, pageSize: query.pageSize, total: items.length };
  }

  async findById(id: number): Promise<Vendor | null> { return this.records.get(id) ?? null; }
  async findByName(name: string): Promise<Vendor | null> { return [...this.records.values()].find((item) => item.name === name) ?? null; }
  async lockById(id: number): Promise<Vendor | null> { return this.findById(id); }
  async create(dto: CreateVendorDto): Promise<Vendor> {
    this.lastCreate = dto;
    const created = vendor({ id: 2, name: dto.name, contactName: dto.contactName ?? null, phone: dto.phone ?? null, email: dto.email ?? null, address: dto.address ?? null });
    this.records.set(created.id, created);
    return created;
  }
  async update(id: number, dto: UpdateVendorDto): Promise<Vendor | null> {
    this.lastUpdate = dto;
    const current = this.records.get(id);
    if (!current) return null;
    const updated = vendor({ ...current, ...dto, id });
    this.records.set(id, updated);
    return updated;
  }
  async setActive(id: number, isActive: boolean): Promise<Vendor | null> {
    const current = this.records.get(id);
    if (!current) return null;
    const updated = vendor({ ...current, isActive, id });
    this.records.set(id, updated);
    return updated;
  }
  async delete(id: number): Promise<Vendor | null> { return this.records.get(id) ?? null; }
}

const prisma = {
  async $transaction<T>(work: (transaction: PrismaTransaction) => Promise<T>): Promise<T> {
    return work({} as PrismaTransaction);
  },
} as never;

test('vendor service trims names and normalizes blank optional contacts to null', async () => {
  const repository = new MemoryVendorRepository();
  const service = new VendorService(repository, prisma);

  await service.create({
    name: '  New Vendor  ',
    contactName: '   ',
    phone: '  0123  ',
    email: ' contact@example.test ',
    address: '',
  });

  assert.deepEqual(repository.lastCreate, {
    name: 'New Vendor',
    contactName: null,
    phone: '0123',
    email: 'contact@example.test',
    address: null,
  });
});

test('vendor service preserves omitted update fields and normalizes changed blanks', async () => {
  const repository = new MemoryVendorRepository();
  const service = new VendorService(repository, prisma);

  await service.update(1, { contactName: '  ' });

  assert.deepEqual(repository.lastUpdate, { contactName: null });
});

test('vendor status is changed through the dedicated status operation', async () => {
  const repository = new MemoryVendorRepository();
  const service = new VendorService(repository, prisma);

  await service.setStatus(1, false);

  assert.equal(repository.records.get(1)?.isActive, false);
});

test('duplicate vendor names are rejected before persistence', async () => {
  const service = new VendorService(new MemoryVendorRepository(), prisma);
  await assert.rejects(
    service.create({ name: ' ABC Computer ' }),
    (error) => error instanceof ConflictError && error.message === 'Vendor name already exists',
  );
});
