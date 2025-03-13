const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : null
    };

    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    
    // Get transactions for each product to calculate totals
    const productsWithTotals = await Promise.all(products.map(async (product) => {
      const transactions = await Transaction.find({
        'productsSold.product': product._id,
        type: 'sale'
      });

      let totalLRD = 0;
      let totalUSD = 0;
      let totalQuantitySold = 0;

      transactions.forEach(transaction => {
        const productSold = transaction.productsSold.find(
          p => p.product.toString() === product._id.toString()
        );
        if (productSold) {
          totalQuantitySold += productSold.quantity;
          totalLRD += productSold.priceLRD * productSold.quantity;
          totalUSD += productSold.priceUSD * productSold.quantity;
        }
      });

      return {
        ...product.toObject(),
        totalLRD,
        totalUSD,
        totalQuantitySold
      };
    }));

    res.json(productsWithTotals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get transactions for this product
    const transactions = await Transaction.find({
      'productsSold.product': product._id,
      type: 'sale'
    });

    let totalLRD = 0;
    let totalUSD = 0;
    let totalQuantitySold = 0;

    transactions.forEach(transaction => {
      const productSold = transaction.productsSold.find(
        p => p.product.toString() === product._id.toString()
      );
      if (productSold) {
        totalQuantitySold += productSold.quantity;
        totalLRD += productSold.priceLRD * productSold.quantity;
        totalUSD += productSold.priceUSD * productSold.quantity;
      }
    });

    res.json({
      ...product.toObject(),
      totalLRD,
      totalUSD,
      totalQuantitySold
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const product = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProductInventory = async (req, res) => {
  try {
    const updateData = {
      ...req.body
    };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductInventory,
  deleteProduct
};
