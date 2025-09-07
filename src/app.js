// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const routes = require('./routes'); // Auto-loads index.js in routes folder
const { errorHandler } = require('./middlewares');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI = process.env.DATABASE_URL;

// Middleware
app.use(cors());
app.use(express.json()); // No need for body-parser
app.use(passport.initialize());
app.use(helmet());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
require('./config/passport');

// MongoDB Connection
if (!mongoURI) {
  console.error('DATABASE_URL is not defined in the environment variables.');
  process.exit(1);
}

console.log('Connecting to MongoDB:', mongoURI);

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() });
});

// Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler || ((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
}));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
