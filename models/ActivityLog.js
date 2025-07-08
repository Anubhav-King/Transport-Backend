import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  role: [String],
  action: String,
  dutyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Duty' },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('ActivityLog', activityLogSchema);
