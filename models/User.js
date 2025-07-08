// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  role: { type: [String], enum: ['Admin', 'Concierge', 'Transport', 'Chauffeur'] },
  password: String,
  available: { type: Boolean, default: true },       // NEW: for Chauffeurs
  reason: { type: String },                          // NEW: if unavailable
}, { timestamps: true });

export default mongoose.model('User', userSchema);
