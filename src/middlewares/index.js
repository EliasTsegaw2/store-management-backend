const auth = require('./auth');
const roleMiddleware = require('./roleMiddleware');
const uploadMiddleware = require('./uploadMiddleware'); // Assuming you have an upload middleware
// Export each middleware for easy import elsewhere
module.exports = {
    auth,
    roleMiddleware,
    uploadMiddleware,
    // Add other middlewares here as needed
};

// Optionally, export errorHandler if you have one
module.exports.errorHandler = (err, req, res, next) => {
    res.status(500).json({ message: err.message });
};