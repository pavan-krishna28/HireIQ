const router = require('express').Router();
const upload = require('../middleware/upload');
const { uploadResume, analyzeResume } = require('../controllers/resumeController');
router.post('/upload', upload.single('resume'), uploadResume);
router.post('/analyze', analyzeResume);
module.exports = router;
