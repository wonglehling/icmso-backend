const express = require('express');
const router = express.Router();
const { updateDoc, deleteDoc, listDoc, readDoc, createDoc, sendEmail } = require('../controllers/groupController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware');

router.get('', requireAuth, listDoc)
router.get('/send', requireAuth, sendEmail)
router.get('/:id', requireAuth, readDoc)
router.post('', requireAuth, createDoc)
router.put('/:id', requireAuth, updateDoc)
router.delete('/:id', requireAuth, deleteDoc)

module.exports = router;