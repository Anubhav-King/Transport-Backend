import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// 🔒 Register New User (Admin adds others)
router.post('/register', verifyToken, async (req, res) => {
  try {
    const { name, mobile, role } = req.body;

    const existing = await User.findOne({ mobile });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashed = await bcrypt.hash('Monday01', 10);
    const user = new User({ name, mobile, role, password: hashed });
    await user.save();

    res.status(201).json({ message: 'User registered with default password Monday01' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔐 One-time Admin Registration
router.post('/register-admin', async (req, res) => {
  try {
    const { name, mobile } = req.body;

    const existing = await User.findOne({ mobile });
    if (existing) return res.status(400).json({ message: 'Admin already exists' });

    const hashed = await bcrypt.hash('Monday01', 10);

    const newUser = new User({
      name,
      mobile,
      password: hashed,
      role: 'Admin'
    });

    await newUser.save();
    res.status(201).json({ message: 'Admin registered with password Monday01' });
  } catch (err) {
    console.error('Register Admin Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔑 Login
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 📋 Get All Users
router.get('/users', verifyToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Fetch Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ❌ Delete User
router.delete('/user/:id', verifyToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✏️ Update Role
router.patch('/update-jobtitles/:id', verifyToken, async (req, res) => {
  try {
    const { role } = req.body;
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ message: 'User role updated' });
  } catch (err) {
    console.error('Role Update Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Chauffeurs List
router.get('/chauffeurs', verifyToken, async (req, res) => {
  try {
    const chauffeurs = await User.find({ role: 'Chauffeur' }); // ✅ full user object
    res.json(chauffeurs);
  } catch (err) {
    console.error('Error fetching chauffeurs:', err);
    res.status(500).json({ error: 'Server error while fetching chauffeurs' });
  }
});

// 🔁 Reset Password to 'Monday01'
router.post('/reset-password/:id', verifyToken, async (req, res) => {
  try {
    const hashed = await bcrypt.hash('Monday01', 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });
    res.json({ message: 'Password reset to Monday01' });
  } catch (err) {
    console.error('Password Reset Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
