const express = require('express');
const router = express.Router();

router.use('/products', require('./product.routes'));
router.use('/users', require('./user.routes'));
router.use('/orders', require('./order.routes'));
router.use('/inventory', require('./inventory.routes'));
router.use('/maintenance', require('./maintenance.routes'));
router.use('/requests', require('./request.routes'));
router.use('/auth', require('./auth.routes'));

module.exports = router;
