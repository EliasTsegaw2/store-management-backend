const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Ensure the path is correct
exports.login = (req, res) => {
  // Passport injects req.user
  const user = req.user;
  const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
  const { password, ...userInfo } = user.toObject();
  res.json({ token, user: userInfo });
};

exports.register = async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const user = new User({ username, password, email, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
