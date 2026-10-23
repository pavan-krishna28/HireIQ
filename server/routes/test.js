const router = require('express').Router();
const { startTest, submitAnswer, submitFinal, getSession } = require('../controllers/testController');
router.post('/start', startTest);
router.post('/submit-answer', submitAnswer);
router.post('/submit-final', submitFinal);
router.get('/session/:token', getSession);
module.exports = router;
