const express = require('express');
const router = express.Router();
const multer = require('multer');
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const {
  getInventory,
  addInventory,
  updateInventory,
  deleteInventory
} = require('../controllers/inventory.controller');

const storage = multer.memoryStorage();
const multerUpload = multer({ storage });
const jwtAuth = passport.authenticate('jwt', { session: false });

// Accept both image and pdf files
const uploadFields = multerUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]);

router.get('/', jwtAuth, getInventory);
router.post(
  '/',
  jwtAuth,
  authorizeRoles('StoreManager'),
  uploadFields, // <-- Accept image and pdf
  addInventory
);
router.put(
  '/:id',
  jwtAuth,
  authorizeRoles('StoreManager'),
  uploadFields, // <-- Accept image and pdf
  updateInventory
);
router.delete('/:id', jwtAuth, authorizeRoles('StoreManager'), deleteInventory);

module.exports = router;