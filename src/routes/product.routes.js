const express = require('express');
const router = express.Router();
const multer = require('multer');
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const { 
  createProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/product.controller');

const storage = multer.memoryStorage();
const multerUpload = multer({ storage });
const jwtAuth = passport.authenticate('jwt', { session: false });

router.post('/', jwtAuth, authorizeRoles('StoreManager'), multerUpload.array('images', 5), createProduct);
router.get('/', getProducts);
router.put('/:id', jwtAuth, authorizeRoles('StoreManager'), updateProduct);
router.delete('/:id', jwtAuth, authorizeRoles('StoreManager'), deleteProduct);

module.exports = router;