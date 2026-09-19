const express = require('express');
const { protect } = require('../middleware/auth');
const { getTargetRoles, getAllTargetRoles, getTargetRoleById } = require('../controllers/targetRoleController');

const router = express.Router();

router.use(protect);
router.get('/all', getAllTargetRoles);
router.get('/', getTargetRoles);
router.get('/:id', getTargetRoleById);

module.exports = router;
