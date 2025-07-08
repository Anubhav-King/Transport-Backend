import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import verifyToken from '../middleware/auth.js';
import RoleChangeLog from '../models/RoleChangeLog.js';


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

    // 🔍 Log creation
    await RoleChangeLog.create({
      userId: user._id,
      changedBy: req.user.id,
      oldRoles: [],
      newRoles: Array.isArray(role) ? role : [role],
      action: 'created',
      timestamp: new Date(),
    });

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
router.delete("/user/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Protect Master Admin
    if (user.role === 'Admin' && user._id.toString() === process.env.MASTER_ADMIN_ID) {
      return res.status(403).json({ message: "Cannot delete the master admin" });
    }

    // 🔍 Log before deletion
    await RoleChangeLog.create({
      userId: user._id,
      changedBy: req.user.id,
      oldRoles: Array.isArray(user.role) ? user.role : [user.role],
      newRoles: [],
      action: 'deleted',
      timestamp: new Date(),
    });

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("User deletion error:", err);
    res.status(500).json({ message: "Server error while deleting user" });
  }
});


// ✏️ Update Role
router.patch("/update-jobtitles/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { role, passcode, action, roles } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!Array.isArray(user.role)) user.role = [user.role];

    let oldRoles = [...user.role];

    // If full role array is being passed (from AdminDashboard)
    if (roles) {
      if (roles.includes('Admin') && !roles.includes('Concierge')) {
        return res.status(400).json({ message: 'Admin requires Concierge' });
      }

      if (roles.includes('Admin') && !oldRoles.includes('Admin')) {
        if (passcode !== 'King@2025') {
          return res.status(403).json({ message: 'Invalid passcode for Admin access' });
        }
      }

      user.role = roles;
    } else if (role && action) {
      // Support legacy add/remove
      if (action === 'add') {
        if (role === 'Admin' && !user.role.includes('Admin')) {
          if (passcode !== 'King@2025') {
            return res.status(403).json({ message: 'Invalid passcode for Admin access' });
          }
        }
        if (!user.role.includes(role)) user.role.push(role);
      } else if (action === 'remove') {
        user.role = user.role.filter((r) => r !== role);
      }
    }

    await user.save();

    // Log the change
    await RoleChangeLog.create({
      userId: id,
      changedBy: req.user.id,
      oldRoles,
      newRoles: user.role,
      timestamp: new Date(),
    });

    res.json({ message: "Role(s) updated successfully" });
  } catch (err) {
    console.error("Role update error:", err);
    res.status(500).json({ message: "Server error while updating role" });
  }
});

// routes/auth.js
router.get("/role-change-logs", verifyToken, async (req, res) => {
  try {
    const logs = await RoleChangeLog.find()
      .sort({ timestamp: -1 })
      .populate('userId', 'name')        // ✅ ensure name is populated
      .populate('changedBy', 'name');    // ✅ same here

    res.json(logs);
  } catch (err) {
    console.error("Error fetching role change logs:", err);
    res.status(500).json({ message: "Failed to fetch role logs" });
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
