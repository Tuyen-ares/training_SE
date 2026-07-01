
class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  getAllProducts() {
    return this.productRepository.getAllProducts();
  }
  addProduct(ProductData){
    //console.log('ProductData:', ProductData);
    if(ProductData.name.length < 3){
      throw new Error('ten san pham ngan qua');
    }
    return this.productRepository.addProduct(ProductData);
  } 
}

module.exports = ProductService;