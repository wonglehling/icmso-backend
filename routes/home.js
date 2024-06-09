const express = require('express');
const router = express.Router();
const { listDoc } = require('../controllers/homeController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware');

router.get('', requireAuth, listDoc)

module.exports = router;