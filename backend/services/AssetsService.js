const prisma = require('../prisma');

const getAllAssets = async () => {
	const assets = await prisma.assets.findMany();
	return assets;
};

const getAssetById = async (id) => {
	const asset = await prisma.assets.findUnique({
		where: { id },
	});
	return asset;
};

const createAsset = async ({ typeId, name, status, qrCode }) => {
	const asset = await prisma.assets.create({
		data: {
			type_id: typeId,
			name: name,
			status: status,
			qr_code: qrCode,
		},
	});
	return asset;
};

const updateAsset = async (id, { typeId, name, status, qrCode }) => {
	const asset = await prisma.assets.update({
		where: { id },
		data: {
			type_id: typeId,
			name: name,
			status: status,
			qr_code: qrCode,
		},
	});
	return asset;
};

const deleteAsset = async (id) => {
	await prisma.assets.delete({
		where: { id },
	});
};

module.exports = { getAllAssets, getAssetById, createAsset, updateAsset, deleteAsset };
