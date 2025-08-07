module.exports = {
  port: process.env.PORT || 3000,
  db: {
    uri: process.env.DB_URI || 'mongodb://localhost:27017/store-management',
  },
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  api: {
    version: 'v1',
    prefix: '/api',
  },
  environment: process.env.NODE_ENV || 'development',
};