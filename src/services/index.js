// This file contains business logic and interacts with the models. 
// It exports functions that perform operations like fetching products, creating orders, and managing inventory.

const Product = require('../models/Product');
const Order = require('../models/Order');

// Fetch all products
const fetchProducts = async () => {
    return await Product.find({});
};

// Create a new order
const createOrder = async (orderData) => {
    const newOrder = new Order(orderData);
    return await newOrder.save();
};

// Additional service functions can be added here

module.exports = {
    fetchProducts,
    createOrder,
    // Export additional functions as needed
};