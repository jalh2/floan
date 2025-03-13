const User = require('../models/User');

const registerUser = async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password,
      userType: userType || 'employee' // Default to employee if not specified
    });

    await user.save();
    res.status(201).json({ 
      username: user.username,
      userType: user.userType
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

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

    res.json({ 
      username: user.username,
      userType: user.userType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const { username } = req.query;
    
    // Check if user exists and is admin
    const requestingUser = await User.findOne({ username });
    if (!requestingUser || requestingUser.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Only return username, userType, and createdAt fields
    const users = await User.find({}, { username: 1, userType: 1, createdAt: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserType = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType, username } = req.body;
    
    // Check if requesting user exists and is admin
    const requestingUser = await User.findOne({ username });
    if (!requestingUser || requestingUser.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Validate user type
    if (!['admin', 'employee'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { userType },
      { new: true, select: 'username userType createdAt' }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  updateUserType
};
