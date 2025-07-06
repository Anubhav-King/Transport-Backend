import mongoose from 'mongoose';

const settingLogSchema = new mongoose.Schema({
  key: { type: String, required: true }, // e.g., "guestCharges"
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  changes: { type: Object, required: true }, // { from: ..., to: ... }
});

const SettingLog = mongoose.model('SettingLog', settingLogSchema);
export default SettingLog;
