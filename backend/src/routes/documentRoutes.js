const express = require('express');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getMyDocuments,
  downloadDocument,
  uploadDocument
} = require('../controllers/documentController');

const router = express.Router();

router.use(protect);
router.get('/', getMyDocuments);
router.get('/:id/file', downloadDocument);
router.post('/upload', upload.single('file'), uploadDocument);

module.exports = router;
