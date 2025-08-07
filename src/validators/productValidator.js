const { body } = require('express-validator');

exports.createProductValidator = [
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
];