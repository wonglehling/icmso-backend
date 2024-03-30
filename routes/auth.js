const express = require('express');
const router = express.Router();
const { test, registerUser, loginUser, getUserProfile } = require('../controllers/authController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware')

router.post('/login', loginUser)
router.post('/register', registerUser) // requireAuth, requireAdmin, 
router.get('/profile', getUserProfile) // requireAuth, requireAdmin, 

module.exports = router;