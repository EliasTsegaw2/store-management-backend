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
  deleteUser,
  updateProfile
} = require('../controllers/user.controller');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const jwtAuth = passport.authenticate('jwt', { session: false });

router.post('/', jwtAuth, authorizeRoles('Admin'), createUserValidator, validate, createUser);
router.get('/', jwtAuth, authorizeRoles('Admin'), getUsers);
router.put('/:id', jwtAuth, authorizeRoles('Admin'), updateUserValidator, validate, updateUser);
router.delete('/:id', jwtAuth, authorizeRoles('Admin'), deleteUser);

// Get current user's profile
router.get('/me', jwtAuth, (req, res) => {
  res.json(req.user);
});

// Update current user's profile (address as object)
router.patch(
  '/me',
  jwtAuth,
  upload.single('photo'),
  updateProfile
);

module.exports = router;