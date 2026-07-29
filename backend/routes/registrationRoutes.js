const express = require('express');
const { registerForEvent, getRegistrations } = require('../controllers/registrationController.js');

const router = express.Router();

router.post('/', registerForEvent);
router.get('/', getRegistrations);

module.exports = router;
