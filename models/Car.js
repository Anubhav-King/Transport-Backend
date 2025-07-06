// models/Car.js
import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  carNumber: { type: String, required: true, unique: true },
  vehicleType: { type: String, required: true },
  fixedChauffeur: { type: String }, // Name of chauffeur (optional)
  available: { type: Boolean, default: true },
  reason: { type: String }, // Required if unavailable
}, { timestamps: true });

export default mongoose.model('Car', carSchema);
