import mongoose from 'mongoose';

const dutyTypeSchema = new mongoose.Schema({
  name: String,
  guestCharge: Number,
  backendCharge: Number,
  baseHours: Number,
  baseKms: Number,
  extraHourRate: Number,
  extraKmRate: Number,
  taxRate: Number
});

export default mongoose.model('DutyType', dutyTypeSchema);
