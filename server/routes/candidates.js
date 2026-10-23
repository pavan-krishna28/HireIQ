const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const c = require('../controllers/candidateController');

router.use(authMiddleware);
router.get('/:id', c.getCandidate);
router.put('/:id', c.updateCandidate);

module.exports = router;
