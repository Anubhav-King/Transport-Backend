import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ✅ Middleware to verify token and attach user
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    req.user = { id: user._id, name: user.name, role: user.role };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ✅ Additional middleware to restrict access to admins
export const isAdmin = (req, res, next) => {
    if ((req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export default verifyToken;
