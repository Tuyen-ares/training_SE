
const productModel = require("../model/products");
class ProductRepository {
  constructor(productsData) {
    this.products = productsData;
  }

  getAllProducts() {
    return this.products;
  }

  addProduct(data) {
    console.log('Adding product:', this.products);
    const newProductId = this.products.length > 0 ? Math.max(...this.products.map(p => p.id)) + 1 : 1;
    const newProduct = new productModel(newProductId, data.name, data.price, data.category);
    this.products.push(newProduct);
    return newProduct;
  }
}

module.exports = ProductRepository;