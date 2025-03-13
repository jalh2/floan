const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUsers, updateUserType } = require('../controllers/userController');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', getUsers);
router.put('/users/:userId/type', updateUserType);

module.exports = router;
