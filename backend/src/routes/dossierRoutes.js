const express = require('express');
const { protect } = require('../middleware/auth');
const { getMyDossier, verifyDossier } = require('../controllers/dossierController');

const router = express.Router();

router.get('/verify/:skillSetuId', verifyDossier); // public — recruiters don't log in
router.get('/me', protect, getMyDossier);

module.exports = router;
