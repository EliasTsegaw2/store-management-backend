const express = require('express');
const router = express.Router();
const passport = require('passport');
const authorizeRoles = require('../middlewares/roleMiddleware');
const {
  createRequest,
  getPendingRequests,
  approveRequest,
  dispatchRequest,
  getApprovedRequests
} = require('../controllers/request.controller');

const jwtAuth = passport.authenticate('jwt', { session: false });

router.post('/', jwtAuth, authorizeRoles('Student', 'DepartmentHead'), createRequest);
router.get('/pending', jwtAuth, authorizeRoles('DepartmentHead'), getPendingRequests);
router.patch('/:id/approve', jwtAuth, authorizeRoles('DepartmentHead'), approveRequest);
router.post('/:id/dispatch', jwtAuth, authorizeRoles('StoreManager'), dispatchRequest);
router.get('/approved', jwtAuth, authorizeRoles('StoreManager', 'DepartmentHead'), getApprovedRequests);

module.exports = router;
