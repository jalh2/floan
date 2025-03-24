const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  item: { type: String, required: true, unique: true },
  measurement: { type: String },
  type: { type: String },
  category: { type: String, enum: ['A', 'B', 'C'] },
  priceLRD: { type: Number },
  priceUSD: { type: Number },
  pieces: { type: Number },
  cts: { type: Number },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('products', productSchema);
