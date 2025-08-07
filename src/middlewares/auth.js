// middlewares/auth.js
const passport = require('passport');
require('../config/passport'); // initialize strategies

module.exports = passport.authenticate('jwt', { session: false });
