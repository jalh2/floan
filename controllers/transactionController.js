const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

// Transaction controller methods will be added here

const createTransaction = async (req, res) => {
  try {
    const { productsSold, currency } = req.body;

    // Calculate total only for selected currency
    let total = 0;
    const enhancedProductsSold = [];

    // Validate products and calculate total
    for (const item of productsSold) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.product} not found` });
      }
      if (product.pieces < item.quantity) {
        return res.status(400).json({ error: `Insufficient quantity for product ${product.item}` });
      }

      // Calculate total based on selected currency
      total += currency === 'LRD' ? 
        product.priceLRD * item.quantity : 
        product.priceUSD * item.quantity;

      // Update product quantity
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { pieces: -item.quantity } }
      );

      // Add enhanced product information
      enhancedProductsSold.push({
        ...item,
        productName: product.item,
        priceAtSale: {
          USD: product.priceUSD,
          LRD: product.priceLRD
        }
      });
    }

    // Create transaction with total only in selected currency and enhanced product info
    const transaction = new Transaction({
      ...req.body,
      productsSold: enhancedProductsSold,
      ...(currency === 'LRD' ? { totalLRD: total } : { totalUSD: total })
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(400).json({ error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .limit(50);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const transactions = await Transaction.find({
      'productsSold.product': productId,
      type: 'sale'
    });

    // Calculate totals
    const totals = transactions.reduce((acc, transaction) => {
      // Find the specific product in productsSold array
      const productSold = transaction.productsSold.find(p => p.product === productId);
      if (!productSold) return acc;

      if (transaction.currency === 'LRD') {
        acc.totalLRD += transaction.totalLRD || 0;
      } else {
        acc.totalUSD += transaction.totalUSD || 0;
      }
      acc.totalQuantity += productSold.quantity;
      return acc;
    }, { totalLRD: 0, totalUSD: 0, totalQuantity: 0 });

    res.json({ 
      transactions,
      totals
    });
  } catch (error) {
    console.error('Error in getTransactionsByProduct:', error);
    res.status(500).json({ error: error.message });
  }
};

const getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: -1 });

    // Calculate totals
    let totalLRD = 0;
    let totalUSD = 0;
    let totalItems = 0;

    transactions.forEach(transaction => {
      if (transaction.currency === 'LRD') {
        totalLRD += transaction.totalLRD || 0;
      } else {
        totalUSD += transaction.totalUSD || 0;
      }
      transaction.productsSold.forEach(product => {
        totalItems += product.quantity;
      });
    });

    res.json({
      transactions,
      summary: {
        totalLRD,
        totalUSD,
        totalItems,
        transactionCount: transactions.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { period, date } = req.query;
    
    if (!period || !date) {
      return res.status(400).json({ error: 'Period and date parameters are required' });
    }

    const reportDate = new Date(date);
    let startDate = new Date(reportDate);
    let endDate = new Date(reportDate);

    // Set time ranges based on period
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        // Set to start of week (Sunday)
        startDate.setDate(reportDate.getDate() - reportDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        // Set to end of week (Saturday)
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(reportDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return res.status(400).json({ error: 'Invalid period. Must be daily, weekly, monthly, or yearly' });
    }

    // Build query
    const query = {
      type: 'sale',
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const transactions = await Transaction.find(query).sort({ date: -1 });

    // Process transactions for report
    let dailyTotals = {};
    let productTotals = {};
    let overallTotals = { totalLRD: 0, totalUSD: 0, totalItems: 0, totalTransactions: 0 };

    transactions.forEach(transaction => {
      // Process daily totals
      const dateKey = transaction.date.toISOString().split('T')[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = {
          date: dateKey,
          totalLRD: 0,
          totalUSD: 0,
          transactions: 0,
          items: 0
        };
      }

      // Update daily totals
      if (transaction.totalLRD) {
        dailyTotals[dateKey].totalLRD += transaction.totalLRD;
        overallTotals.totalLRD += transaction.totalLRD;
      }
      if (transaction.totalUSD) {
        dailyTotals[dateKey].totalUSD += transaction.totalUSD;
        overallTotals.totalUSD += transaction.totalUSD;
      }
      dailyTotals[dateKey].transactions += 1;
      overallTotals.totalTransactions += 1;

      // Process product totals and item counts
      transaction.productsSold.forEach(product => {
        const quantity = product.quantity || 0;
        dailyTotals[dateKey].items += quantity;
        overallTotals.totalItems += quantity;

        const productKey = product.productName;
        if (!productTotals[productKey]) {
          productTotals[productKey] = {
            name: product.productName,
            quantitySold: 0,
            totalLRD: 0,
            totalUSD: 0
          };
        }

        productTotals[productKey].quantitySold += quantity;
        if (transaction.currency === 'LRD' && product.priceAtSale) {
          productTotals[productKey].totalLRD += quantity * (product.priceAtSale.LRD || 0);
        } else if (product.priceAtSale) {
          productTotals[productKey].totalUSD += quantity * (product.priceAtSale.USD || 0);
        }
      });
    });

    // Sort daily totals by date
    const sortedDailyTotals = Object.values(dailyTotals).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    // Sort product totals by quantity sold
    const sortedProductTotals = Object.values(productTotals).sort((a, b) => 
      b.quantitySold - a.quantitySold
    );

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      dailyTotals: sortedDailyTotals,
      productTotals: sortedProductTotals,
      summary: {
        totalTransactions: overallTotals.totalTransactions,
        totalItems: overallTotals.totalItems,
        totalLRD: overallTotals.totalLRD,
        totalUSD: overallTotals.totalUSD
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const topProducts = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          type: 'sale'
        }
      },
      { $unwind: '$productsSold' },
      {
        $group: {
          _id: '$productsSold.product',
          totalQuantity: { $sum: '$productsSold.quantity' },
          totalSalesLRD: { $sum: '$totalLRD' },
          totalSalesUSD: { $sum: '$totalUSD' },
          transactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          item: '$product.item',
          totalQuantity: 1,
          totalSalesLRD: 1,
          totalSalesUSD: 1,
          transactions: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionsByDate,
  getTransactionsByProduct,
  getTransactionsByDateRange,
  getSalesReport,
  getTopProducts
};
