const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
  getRecommendations,
  processVoiceQuery,
  processNaturalLanguageSearch,
  translateEventDescription,
} = require('../controllers/aiController');

router.post('/recommendations', getRecommendations);
router.post('/voice-assistant', optionalAuth, processVoiceQuery);
router.post('/nl-search', optionalAuth, processNaturalLanguageSearch);
router.post('/translate', optionalAuth, translateEventDescription);

module.exports = router;
