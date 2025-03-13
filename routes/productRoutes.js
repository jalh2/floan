const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/productController');
const upload = require('../middleware/upload');

// Product routes will be added here

// Create a new product with image upload
router.post('/', upload.single('image'), createProduct);

// Get all products
router.get('/', getProducts);

// Get a specific product
router.get('/:id', getProductById);

// Update a product 
router.put('/:id', updateProduct);

// Delete a product
router.delete('/:id', deleteProduct);

module.exports = router;
