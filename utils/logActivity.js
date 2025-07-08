import ActivityLog from '../models/ActivityLog.js';

const logActivity = async ({ userId, userName, role, action, dutyId }) => {
  try {
    const roleArray = Array.isArray(role) ? role : [role];

    await ActivityLog.create({
      userId,
      userName,
      role: roleArray,
      action,
      dutyId,
      timestamp: new Date(),
    });
  } catch (err) {
    console.warn('Failed to log activity:', err.message);
  }
};

export default logActivity;
