const express = require('express');
const router = express.Router();
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const {
  createMaintenance,
  getAllMaintenance
} = require('../controllers/maintenance.controller');

const jwtAuth = passport.authenticate('jwt', { session: false });

router.post('/', jwtAuth, authorizeRoles('ARA', 'StoreManager'), createMaintenance);
router.get('/', jwtAuth, authorizeRoles('StoreManager','Lecturer', 'ARA', 'DepartmentHead'), getAllMaintenance);

module.exports = router;