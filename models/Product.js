const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  item: { type: String, required: true },
  measurement: { type: String },
  type: { type: String },
  category: { type: String, enum: ['A', 'B', 'C'] },
  priceLRD: { type: Number },
  priceUSD: { type: Number },
  pieces: { type: Number },
  cts: { type: Number },
  store: {
    type: String,
    required: true,
    trim: true
  },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Create a compound index for item and store to ensure unique items per store
productSchema.index({ item: 1, store: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
