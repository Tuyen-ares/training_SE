
const productModel = require("../model/assets");
class AssetRepository {
  constructor(assetsData) {
    this.assets = assetsData;
  }

  async getAllAssets() {
    const [rows] = await this.assets.query('SELECT * FROM assets');
    return rows;
  }

  async addAsset(data,qrcode) {
    console.log('Adding asset:', this.assets);
    // const newAssetId = this.assets.length > 0 ? Math.max(...this.assets.map(a => a.id)) + 1 : 1;
    const [rows] =
     await this.assets.query('INSERT INTO assets (type_id, name, status, qr_code) VALUES (?, ?, ?, ?)',
       [data.type_id, data.name, data.status, qrcode]);
    const newAssetId = rows.insertId;
    const qrCode = qrcode;
    const newAsset = new productModel(newAssetId, data.type_id, data.name, data.status, qrCode);
    return newAsset;
  }
}

module.exports = AssetRepository;