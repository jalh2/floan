const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Create a new transaction
router.post('/', transactionController.createTransaction);

// Get all transactions
router.get('/', transactionController.getTransactions);

// Get transactions by product (must come before /:id)
router.get('/product/:productId', transactionController.getTransactionsByProduct);

// Get transactions by date (must come before /:id)
router.get('/date/:date', transactionController.getTransactionsByDate);

// Get a specific transaction (must come last)
router.get('/:id', transactionController.getTransactionById);

module.exports = router;
