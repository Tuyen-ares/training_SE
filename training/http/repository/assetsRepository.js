
const productModel = require("../model/assets");
class AssetRepository {
  constructor(assetsData) {
    this.assets = assetsData;
  }

  async getAllAssets() {
    const [rows] = await this.assets.query('SELECT * FROM assets');
    return rows;
  }

  async addAsset(data) {
    console.log('Adding asset:', this.assets);
    const newAssetId = this.assets.length > 0 ? Math.max(...this.assets.map(a => a.id)) + 1 : 1;
    const newAsset = new productModel(newAssetId, data.type_id, data.name, data.status, data.qr_code, data.create_at);
    this.assets.push(newAsset);
    return newAsset;
  }
}

module.exports = AssetRepository;