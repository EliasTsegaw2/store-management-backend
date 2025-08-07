const { body } = require('express-validator');

exports.createOrderValidator = [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('items').isArray({ min: 1 }).withMessage('Items array is required'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required for each item'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1 for each item'),
];

exports.updateOrderValidator = [
    body('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('Invalid status'),
];