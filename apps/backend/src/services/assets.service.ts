import {BaseService} from '@/shared/base.service.js';
import type { IAssetRepository } from '@/repositories/asset.repository.js';
import type { Asset, CreateAssetDto, UpdateAssetDto } from '@/models/asset.model.js';
import { ConflictError } from '@/shared/app-error.js';
export class AssetService extends BaseService<Asset, CreateAssetDto, UpdateAssetDto, IAssetRepository> {
	constructor(repo: IAssetRepository) {
		super(repo)
	}

	override async create(dto: CreateAssetDto): Promise<{ data?: Asset; error?: string }> {
		const existing = await this.repo.findByQrCode(dto.qr_code);
		const existingBySerialNumber = await this.repo.findBySerialNumber(dto.serial_number);

		if (existing) {
			return { error: 'Asset with this QR code already exists' };
		}
		if (existingBySerialNumber) {
			return { error: 'Asset with this serial number already exists' };
		}
		return super.create(dto);
	}

	override async update(id: number, dto: UpdateAssetDto): Promise<Asset | null> {
		const existing = await this.repo.findByQrCode(dto.qr_code);
		const existingBySerialNumber = await this.repo.findBySerialNumber(dto.serial_number);

		if (existing) {
			throw new ConflictError('QR code already exists');
		}
		if (existingBySerialNumber) {
			throw new ConflictError('Serial number already exists');
		}
		return super.update(id, dto);
	}
}
