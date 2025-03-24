const User = require('../models/User');
const crypto = require('crypto');

const registerUser = async (req, res) => {
  try {
    const { username, password, userType, store } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password,
      userType: userType || 'employee',
      store
    });

    await user.save();
    res.status(201).json({ 
      username: user.username,
      userType: user.userType,
      store: user.store
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password, store } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password using the comparePassword method from our schema
    const isMatch = user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Verify store access
    if (user.store !== store) {
      return res.status(403).json({ error: 'Access to this store not allowed' });
    }

    res.json({ 
      username: user.username,
      userType: user.userType,
      store: user.store
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'username userType store');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserType = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body;

    if (!['admin', 'employee'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { userType },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      userType: user.userType,
      store: user.store
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStores = async (req, res) => {
  try {
    const stores = await User.distinct('store');
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = password;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsersByStore = async (req, res) => {
  try {
    const { store } = req.params;
    const users = await User.find({ store }, 'username');
    res.json(users.map(user => user.username));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  updateUserType,
  getStores,
  changePassword,
  deleteUser,
  getUsersByStore
};
