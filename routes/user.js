const express = require('express');
const router = express.Router();
const { updateDoc, deleteDoc, listDoc, readDoc, createDoc } = require('../controllers/userController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware');

router.get('', requireAuth, listDoc)
router.get('/:id', requireAuth, readDoc)
router.post('', requireAuth, createDoc)
router.put('/:id', requireAuth, updateDoc)
router.put('/', requireAuth, updateDoc)
router.delete('/:id', requireAuth, deleteDoc)

module.exports = router;