// models/AvailabilityLog.js
import mongoose from 'mongoose';

const availabilityLogSchema = new mongoose.Schema({
  //carNumber: { type: String, required: true },
  //vehicleType: { type: String, required: true },
  //chauffeurName: { type: String }, // If any
  available: { type: Boolean, required: true },
  reason: { type: String }, // Required if unavailable
  updatedBy: { type: String, required: true }, // Who made the change
}, { timestamps: true });

export default mongoose.model('AvailabilityLog', availabilityLogSchema);
