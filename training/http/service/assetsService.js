
class AssetService {
  constructor(assetRepository) {
    this.assetRepository = assetRepository;
  }

  getAllAssets() {
    return this.assetRepository.getAllAssets();
  }
  addAsset(AssetData){
    //console.log('AssetData:', AssetData);
    if(AssetData.name.length < 3){
      throw new Error('ten tai san ngan qua');
    }
    return this.assetRepository.addAsset(AssetData);
  } 
}

module.exports = AssetService;