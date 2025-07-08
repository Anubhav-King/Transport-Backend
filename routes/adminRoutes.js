import express from 'express';
import verifyToken from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

// Get latest activity logs (limit 100)
router.get('/activity-logs', verifyToken, async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

export default router;
