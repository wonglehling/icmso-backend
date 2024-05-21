const express = require('express');
const router = express.Router();
const { updateDoc, deleteDoc, listDoc, readDoc, createDoc, updateUserItemMatrix, updateItemSimilarityDF } = require('../controllers/activityController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware');

router.get('', requireAuth, listDoc)
router.get('/test', requireAuth, updateUserItemMatrix)
router.get('/update-item-similarity-df', requireAuth, updateItemSimilarityDF)
router.get('/:id', requireAuth, readDoc)
router.post('', requireAuth, createDoc)
router.put('/:id', requireAuth, updateDoc)
router.delete('/:id', requireAuth, deleteDoc)

module.exports = router;