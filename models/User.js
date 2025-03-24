const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  salt: {
    type: String
  },
  userType: {
    type: String,
    enum: ['admin', 'employee'],
    required: true,
    default: 'employee'
  },
  store: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Hash the password with the salt
  const hash = crypto
    .pbkdf2Sync(this.password, salt, 1000, 64, 'sha512')
    .toString('hex');
    
  this.salt = salt;
  this.password = hash;
  next();
});

// Method to compare password
userSchema.methods.comparePassword = function(candidatePassword) {
  const hash = crypto
    .pbkdf2Sync(candidatePassword, this.salt, 1000, 64, 'sha512')
    .toString('hex');
  return this.password === hash;
};

module.exports = mongoose.model('User', userSchema);
