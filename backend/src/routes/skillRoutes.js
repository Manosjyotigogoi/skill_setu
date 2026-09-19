const express = require('express');
const { protect } = require('../middleware/auth');
const { getMySkills, getSkillById, deleteSkill } = require('../controllers/skillController');

const router = express.Router();

router.use(protect);
router.get('/', getMySkills);
router.get('/:id', getSkillById);
router.delete('/:id', deleteSkill);

module.exports = router;
