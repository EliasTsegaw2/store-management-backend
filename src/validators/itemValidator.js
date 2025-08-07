const { body } = require('express-validator');

exports.createItemValidator = [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('location').optional().isString().withMessage('Location must be a string'),
];

exports.updateItemValidator = [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('location').optional().isString().withMessage('Location must be a string'),
];