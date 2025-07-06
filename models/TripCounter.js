import mongoose from 'mongoose';

const tripCounterSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: DDMMYY
  count: { type: Number, default: 0 },
});

export default mongoose.model('TripCounter', tripCounterSchema);
