const express = require('express');
const router = express.Router();
const { updateDoc, deleteDoc, listDoc, readDoc, createDoc,addToFav, removeFav } = require('../controllers/userController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware');

router.get('/all', requireAuth, listDoc)
router.get('/recommendation/add/:doc_id', requireAuth, addToFav)
router.get('/recommendation/remove/:doc_id', requireAuth, removeFav)
router.get('/', requireAuth, readDoc)
router.post('', requireAuth, createDoc)
router.put('/:id', requireAuth, updateDoc)
router.put('/', requireAuth, updateDoc)
router.delete('/:id', requireAuth, deleteDoc)

module.exports = router;