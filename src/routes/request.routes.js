const express = require('express');
const router = express.Router();
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const {
  createRequest,
  getPendingRequests,
  approveRequest,
  dispatchRequest,
  getApprovedRequests,
  returnRequest
} = require('../controllers/request.controller');

const jwtAuth = passport.authenticate('jwt', { session: false });

// Allow Students, ARA, and Lecturer to create requests
router.post('/', jwtAuth, authorizeRoles('Student', 'ARA', 'Lecturer'), createRequest);

router.get('/pending', jwtAuth, getPendingRequests);
router.patch('/:id/approve', jwtAuth, authorizeRoles('DepartmentHead'), approveRequest);
router.patch('/:id/dispatch', jwtAuth, authorizeRoles('StoreManager'), dispatchRequest);
router.patch('/:id/return', jwtAuth, authorizeRoles('StoreManager'), returnRequest);
router.get('/approved', jwtAuth, authorizeRoles('StoreManager', 'DepartmentHead'), getApprovedRequests);

module.exports = router;
