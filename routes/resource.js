const multer = require('multer')
const express = require('express');
const router = express.Router();
const { updateDoc, deleteDoc, listDoc, readDoc, createDoc } = require('../controllers/resourceController')
const { requireAdmin, requireAuth } = require('../middlewares/authMiddleware');
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-')+ file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // reject a file
  // if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  // } else {
  //   cb(null, false);
  // }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});

router.get('', requireAuth, listDoc)
router.get('/:id', requireAuth, readDoc)
router.post('', upload.single('resource_file'), requireAuth, createDoc)
router.put('/:id', requireAuth, updateDoc)
router.delete('/:id', requireAuth, deleteDoc)

module.exports = router;