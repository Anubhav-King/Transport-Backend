import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  enabled: Boolean,
  parkingCharges: Number,
  fuelCharges: Number,
  expenseImage: String
}, { _id: false });

const transportRequestSchema = new mongoose.Schema({
  requestDate: String,
  guestName: String,
  checkType: String,
  roomNumber: String,
  mobileNumber: String,
  requestedTime: String,
  transportType: String,
  carNumber: String,
  chauffeurName: String,
  dutyType: String,
  remarks: String,
  createdOn: String,
  status: { type: String, default: 'Active' },
  startTime: String,
  startKM: Number,
  endTime: String,
  endKM: Number,
  totalRunTime: String,
  totalRunKM: Number,
  expense: expenseSchema,
  guestCharges: Number,
  backendCharges: Number,
  taxApplied: Number,
  netProfit: Number
});

export default mongoose.model('TransportRequest', transportRequestSchema);
