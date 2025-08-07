const express = require('express');
const router = express.Router();
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validate = require('../validators/validate');
const { createUserValidator, updateUserValidator } = require('../validators/userValidator');
const { 
  createUser, 
  getUsers, 
  updateUser, 
  deleteUser 
} = require('../controllers/user.controller');

const jwtAuth = passport.authenticate('jwt', { session: false });

router.post('/', jwtAuth, authorizeRoles('Admin'), createUserValidator, validate, createUser);
router.get('/', jwtAuth, authorizeRoles('Admin'), getUsers);
router.put('/:id', jwtAuth, authorizeRoles('Admin'), updateUserValidator, validate, updateUser);
router.delete('/:id', jwtAuth, authorizeRoles('Admin'), deleteUser);

module.exports = router;