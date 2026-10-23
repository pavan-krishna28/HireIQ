const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { getReport, getLeaderboard } = require('../controllers/reportController');
router.use(authMiddleware);
router.get('/:session_id', getReport);
router.get('/job/:job_id/leaderboard', getLeaderboard);
module.exports = router;
