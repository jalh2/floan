const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

// Transaction controller methods will be added here

const createTransaction = async (req, res) => {
  try {
    const { productsSold, currency } = req.body;

    // Calculate total only for selected currency
    let total = 0;

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
    }

    // Create transaction with total only in selected currency
    const transaction = new Transaction({
      ...req.body,
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
      .populate('productsSold.product')
      .sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('productsSold.product');
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
    const date = new Date(req.params.date);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const transactions = await Transaction.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('productsSold.product')
      .sort({ date: -1 });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionsByProduct = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      'productsSold.product': req.params.productId,
      type: 'sale'
    }).populate('productsSold.product');

    // Calculate totals
    const totals = transactions.reduce((acc, transaction) => {
      if (transaction.currency === 'LRD') {
        acc.totalLRD += transaction.totalLRD;
      } else {
        acc.totalUSD += transaction.totalUSD;
      }
      acc.totalQuantity += transaction.productsSold[0].quantity;
      return acc;
    }, { totalLRD: 0, totalUSD: 0, totalQuantity: 0 });

    res.json({ 
      transactions,
      totals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTransactionsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      date: { $gte: start, $lte: end },
      type: 'sale'
    }).populate('productsSold.product')
      .sort({ date: -1 });

    // Calculate totals
    const totals = transactions.reduce((acc, transaction) => {
      acc.totalLRD += transaction.totalLRD || 0;
      acc.totalUSD += transaction.totalUSD || 0;
      acc.totalTransactions += 1;
      return acc;
    }, { totalLRD: 0, totalUSD: 0, totalTransactions: 0 });

    // Group transactions by day
    const dailyTotals = transactions.reduce((acc, transaction) => {
      const day = transaction.date.toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = { totalLRD: 0, totalUSD: 0, count: 0 };
      }
      acc[day].totalLRD += transaction.totalLRD || 0;
      acc[day].totalUSD += transaction.totalUSD || 0;
      acc[day].count += 1;
      return acc;
    }, {});

    res.json({
      transactions,
      totals,
      dailyTotals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { period, date } = req.query;
    const endDate = new Date(date || Date.now());
    let startDate = new Date(endDate);

    // Set time range based on period
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        return res.status(400).json({ error: 'Invalid period specified' });
    }

    // Aggregate sales data
    const aggregation = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: 'sale'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'daily' ? '%Y-%m-%d' : 
                      period === 'weekly' ? '%Y-W%V' :
                      period === 'monthly' ? '%Y-%m' : '%Y',
              date: '$date'
            }
          },
          totalLRD: { $sum: '$totalLRD' },
          totalUSD: { $sum: '$totalUSD' },
          count: { $sum: 1 },
          transactions: { $push: '$$ROOT' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Calculate overall totals
    const totals = aggregation.reduce((acc, group) => {
      acc.totalLRD += group.totalLRD || 0;
      acc.totalUSD += group.totalUSD || 0;
      acc.totalTransactions += group.count;
      return acc;
    }, { totalLRD: 0, totalUSD: 0, totalTransactions: 0 });

    res.json({
      period,
      startDate,
      endDate,
      aggregation,
      totals
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
