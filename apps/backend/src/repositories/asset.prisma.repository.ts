import { BasePrismaRepository } from '@/shared/base.repository.js';
import type { IAssetRepository } from '@/repositories/asset.repository.js';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '@/models/asset.model.js';
import type { PrismaClient } from '../../generated/prisma/index.js';

export class PrismaAssetRepository
  extends BasePrismaRepository<Asset, CreateAssetDto, UpdateAssetDto>
  implements IAssetRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.assets);
  }

  findByQrCode(qrCode: string): Promise<Asset | null> {
    return this.prisma.assets.findUnique({ where: { qr_code: qrCode } });
  }

  findBySerialNumber(serialNumber: string): Promise<Asset | null> {
    return this.prisma.assets.findUnique({ where: { serial_number: serialNumber } });
  }
}
