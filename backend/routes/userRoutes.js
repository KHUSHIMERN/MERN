const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../controllers/userController');

router.route('/profile')
  .get(getUserProfile)
  .patch(updateUserProfile);

module.exports = router;
