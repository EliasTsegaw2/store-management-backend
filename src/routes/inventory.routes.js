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

router.get('/', jwtAuth, getInventory);
router.post('/', jwtAuth, authorizeRoles('StoreManager'), addInventory);
router.put('/:id', jwtAuth, authorizeRoles('StoreManager'), multerUpload.single('image'), updateInventory);
router.delete('/:id', jwtAuth, authorizeRoles('StoreManager'), deleteInventory);

module.exports = router;