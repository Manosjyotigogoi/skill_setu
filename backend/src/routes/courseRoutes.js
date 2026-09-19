const express = require('express');
const { protect } = require('../middleware/auth');
const { getCourses, getRecommendedCourses, toggleEnrollment, updateProgress } = require('../controllers/courseController');

const router = express.Router();

router.use(protect);
router.get('/', getCourses);
router.get('/recommendations', getRecommendedCourses);
router.post('/:id/enroll', toggleEnrollment);
router.patch('/:id/progress', updateProgress);


module.exports = router;
