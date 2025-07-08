// models/RoleChangeLog.js
import mongoose from 'mongoose';

const roleChangeLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  oldRoles: [String],  // optional for create/delete
  newRoles: [String],  // optional for delete
  action: { type: String, enum: ['created', 'deleted', 'updated'] },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('RoleChangeLog', roleChangeLogSchema);
