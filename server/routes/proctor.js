const router = require('express').Router();
const { flag } = require('../controllers/proctorController');
router.post('/flag', flag);
module.exports = router;
