// models/Duty.js
import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
});

const expenseEntrySchema = new mongoose.Schema({
  amount: Number,
  remark: String,
  image: String,
});

const verifiedExpenseSchema = new mongoose.Schema({
  label: { type: String, required: true },   // Add this
  amount: Number,
  category: String, // parking, fuel, misc
  type: String,     // guest or backend
  remark: String,
});


const dutySchema = new mongoose.Schema({
  guestName: String,
  guestType: String,
  roomNumber: String,
  mobileNumber: String,
  pickupDateTime: Date,
  vehicleType: String,
  dutyType: String,
  packageCode: String,
  pickupLocation: String,
  dropLocation: String,
  carNumber: String,
  chauffeurName: String,
  remarks: String,
  startKm: Number,
  endKm: Number,
  startTime: Date,
  endTime: Date,
  guestCharge: Object,
  backendCharge: Object,
  originalCharges: {
    guest: Object,
    backend: Object,
  },


  additionalKm: Number,
  additionalHours: Number,
  additionalChargesRemark: {
    km: { type: String },
    hr: { type: String },
  },

  charges: {
    type: String,
    enum: ['Chargeable', 'Complimentary', 'Part of Package'],
    default: 'Chargeable',
  },

  tripID: { type: String, required: true, unique: true },
  discountPercentage: Number,
  discountedPrice: Number,
  discountRemark: String,

  verifiedExpenses: [verifiedExpenseSchema],

  status: {
    type: String,
    enum: [
      'pending',
      'active',
      'in-progress',
      'pending-verification-transport',
      'pending-verification-concierge',
      'completed',
      'cancelled',
    ],
    default: 'pending',
  },

  statusHistory: {
    type: [statusHistorySchema],
    default: [{ status: 'pending', timestamp: new Date() }],
  },

  cancellationReason: String,
  createdOn: String,

  expenses: {
    parking: {
      enabled: Boolean,
      entries: [expenseEntrySchema],
    },
    fuel: {
      enabled: Boolean,
      entries: [expenseEntrySchema],
    },
    misc: {
      enabled: Boolean,
      entries: [expenseEntrySchema],
    },
  }
}, { timestamps: true });

export default mongoose.model('Duty', dutySchema);
