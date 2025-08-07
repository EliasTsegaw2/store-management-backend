const express = require('express');
const router = express.Router();
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const validate = require('../validators/validate');
const { createOrderValidator, updateOrderValidator } = require('../validators/orderValidator');
const {
  createOrder,
  getOrders,
  updateOrder,
  deleteOrder,
  createItem,
  approveOrder,
  deleteItem
} = require('../controllers/order.controller');

const jwtAuth = passport.authenticate('jwt', { session: false });

router.post('/', jwtAuth, createOrderValidator, validate, createOrder);
router.get('/', jwtAuth, getOrders);
router.put('/:id', jwtAuth, authorizeRoles('StoreManager', 'DepartmentHead'), updateOrderValidator, validate, updateOrder);
router.delete('/:id', jwtAuth, authorizeRoles('StoreManager'), deleteOrder);
router.post('/item', jwtAuth, createItem);
router.patch('/:id/approve', jwtAuth, authorizeRoles('DepartmentHead'), approveOrder);
router.delete('/item', jwtAuth, deleteItem);

module.exports = router;