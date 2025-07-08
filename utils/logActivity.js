import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';

const logActivity = async ({ userId, role, action, dutyId = null }) => {
  const user = await User.findById(userId);
  const log = new ActivityLog({
    userId,
    userName: user?.name || '',
    role,
    action,
    dutyId,
  });
  await log.save();
};

export default logActivity;
