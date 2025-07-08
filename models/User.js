// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  role: { type: [String], enum: ['Admin', 'Concierge', 'Transport', 'Chauffeur'] },
  password: String,
  mustChange: { type: Boolean, default: false },       // ✅ Add this line
  available: { type: Boolean, default: true },          // for Chauffeurs
  reason: { type: String },                             // if unavailable
}, { timestamps: true });

export default mongoose.model('User', userSchema);
