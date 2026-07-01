const {resEnd, resError} = require('../helpers/response');
const {parseBody} = require('../helpers/parseHttp');

class AssetController {
  constructor(assetService) {
    this.assetService = assetService;
  }

   getAllAssets = async ( req, res) => {
    try {
      const assets = await this.assetService.getAllAssets();
      resEnd(res, 200, 'application/json', assets);
    }
    catch (err) {
      resError(res, 500, 'application/json', 'Internal Server Error');
    }
   }

   addAsset = async (req, res) => {
    try {
      const newAsset = await parseBody(req);
      const addedAsset = await this.assetService.addAsset(newAsset);
      resEnd(res, 201, 'application/json', addedAsset);
    }
    catch (err) {
      resError(res, 400, 'application/json', 'Invalid JSON');
    }
   }

}

module.exports = AssetController;