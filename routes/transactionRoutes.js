const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Get all transactions
router.get('/', transactionController.getTransactions);

// Get transactions by date range
router.get('/range', transactionController.getTransactionsByDateRange);

// Get sales report (daily/weekly/monthly/yearly)
router.get('/report', transactionController.getSalesReport);

// Get top selling products
router.get('/top-products', transactionController.getTopProducts);

// Get transactions by product
router.get('/product/:productId', transactionController.getTransactionsByProduct);

// Get transactions by date
router.get('/date/:date', transactionController.getTransactionsByDate);

// Get a specific transaction
router.get('/:id', transactionController.getTransactionById);

module.exports = router;
