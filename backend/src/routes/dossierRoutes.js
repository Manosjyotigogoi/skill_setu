const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const { getMyDossier, verifyDossier } = require('../controllers/dossierController');

const router = express.Router();

router.get('/verify/:skillSetuId', optionalAuth, verifyDossier); // public with optional auth
router.get('/me', protect, getMyDossier);

module.exports = router;

