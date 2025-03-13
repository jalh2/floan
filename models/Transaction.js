const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  type: { type: String, required: true, enum: ['sale', 'restock'], default: 'sale' },
  currency: { type: String, required: true, enum: ['LRD', 'USD'], default: 'LRD' },
  productsSold: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true }
  }],
  totalLRD: { 
    type: Number, 
    required: function() { return this.currency === 'LRD'; },
    default: 0
  },
  totalUSD: { 
    type: Number, 
    required: function() { return this.currency === 'USD'; },
    default: 0
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
