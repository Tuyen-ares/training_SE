const {randomUUID } = require("crypto");
class AssetService {
  constructor(assetRepository) {
    this.assetRepository = assetRepository;
  }

  async getAllAssets() {
    return await this.assetRepository.getAllAssets();
  }
  async addAsset(AssetData){
    //console.log('AssetData:', AssetData);
    if(AssetData.name.length < 3){
      throw new Error('ten tai san ngan qua');
    }
    const qrcode = randomUUID();
    return await this.assetRepository.addAsset(AssetData, qrcode);
  } 
}

module.exports = AssetService;