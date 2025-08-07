const express = require('express');
const router = express.Router();
const passport = require('passport');
const { login, register } = require('../controllers/authController');

router.post('/login', passport.authenticate('local', { session: false }), login);
router.post('/register', register);

module.exports = router;