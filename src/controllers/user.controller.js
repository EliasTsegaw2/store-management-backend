// controllers/userController.js

const { User } = require('../models');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// === USER CONTROLLERS ===

const createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const allowedFields = [
      'displayName', 'photo', 'phone', 'address',
      'studentId', 'department', 'courseCode', 'yearOfStudy',
      'employeeId', 'position', 'officeLocation'
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Parse address if sent as a JSON string
    if (updates.address && typeof updates.address === 'string') {
      try {
        updates.address = JSON.parse(updates.address);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid address format.' });
      }
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get current user's profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update current user's profile
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'displayName', 'phone', 'address',
      'studentId', 'department', 'courseCode', 'yearOfStudy',
      'employeeId', 'position', 'officeLocation'
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Parse address if sent as a JSON string (from FormData)
    if (updates.address && typeof updates.address === 'string') {
      try {
        updates.address = JSON.parse(updates.address);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid address format.' });
      }
    }
    // Upload photo to SeaweedFS if present
    if (req.file) {
      // No need to upload to SeaweedFS here if your frontend already does it,
      // or if you have a separate upload handler.
      // Just set the photo URL using the original filename:
      updates.photo = `http://localhost:8888/myimages/${encodeURIComponent(req.file.originalname)}`;
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile
};
