// seedSettings.js (ES Module version)

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Setting from './models/Setting.js';

dotenv.config();

const MONGODB_URI = "mongodb+srv://King:King%402025@transport-db.8el6k4m.mongodb.net/?retryWrites=true&w=majority&appName=Transport-DB";

const seedSettings = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Setting.deleteMany(); // Optional: clear existing settings

    const settings = [
      {
        key: 'dutyTypes',
        label: 'Duty Types',
        values: ['Airport Pickup', 'Airport Drop', 'Local Use', 'Office Transfer'],
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed"),
      },
      {
        key: 'vehicleTypes',
        label: 'Vehicle Types',
        values: [
          { type: 'Sedan', label: 'Sedan' },
          { type: 'SUV', label: 'SUV' },
          { type: 'Innova', label: 'Innova' },
          { type: 'Luxury', label: 'Luxury' }
        ],
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed"),
      },
      {
        key: 'localUsePackages',
        label: 'Local Use Packages',
        values: [
          { label: '2 Hours / 20 Kms', hours: 2, kms: 20 },
          { label: '4 Hours / 40 Kms', hours: 4, kms: 40 },
          { label: '8 Hours / 80 Kms', hours: 8, kms: 80 }
        ],
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed"),
      },
      {
        key: 'localUseCharges',
        label: 'Local Use Charges',
        values: {
          '2 Hours / 20 Kms': {
            Sedan: { guestCharge: 1000, backendCharge: 500 },
            SUV: { guestCharge: 1200, backendCharge: 600 },
            Innova: { guestCharge: 1400, backendCharge: 700 },
            Luxury: { guestCharge: 1800, backendCharge: 900 }
          },
          '4 Hours / 40 Kms': {
            Sedan: { guestCharge: 2000, backendCharge: 1000 },
            SUV: { guestCharge: 2400, backendCharge: 1200 },
            Innova: { guestCharge: 2800, backendCharge: 1400 },
            Luxury: { guestCharge: 3600, backendCharge: 1800 }
          },
          '8 Hours / 80 Kms': {
            Sedan: { guestCharge: 3500, backendCharge: 1750 },
            SUV: { guestCharge: 4200, backendCharge: 2100 },
            Innova: { guestCharge: 4900, backendCharge: 2450 },
            Luxury: { guestCharge: 6300, backendCharge: 3150 }
          }
        },
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed"),
      },
      {
        key: 'dutyCharges',
        label: 'Guest Charges',
        values: {
          Sedan: {
            'Airport Pickup': 4000,
            'Airport Drop': 4000
          },
          SUV: {
            'Airport Pickup': 4000,
            'Airport Drop': 4000
          },
          Innova: {
            'Airport Pickup': 4000,
            'Airport Drop': 4000
          },
          Luxury: {
            'Airport Pickup': 4000,
            'Airport Drop': 4000
          }
        },
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed"),
      },
      {
        key: 'backendCharges',
        label: 'Backend Charges',
        values: {
          Sedan: {
            'Airport Pickup': 2000,
            'Airport Drop': 2000
          },
          SUV: {
            'Airport Pickup': 2000,
            'Airport Drop': 2000
          },
          Innova: {
            'Airport Pickup': 2000,
            'Airport Drop': 2000
          },
          Luxury: {
            'Airport Pickup': 2000,
            'Airport Drop': 2000
          }
        },
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed"),
      },
      {
        key: 'guestExtraCharges',
        label: 'Guest Extra Charges',
        values: {
          Sedan: { perHour: 300, perKm: 15 },
          SUV: { perHour: 400, perKm: 18 },
          Innova: { perHour: 500, perKm: 20 },
          Luxury: { perHour: 800, perKm: 30 }
        },
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed")
      },
      {
        key: 'backendExtraCharges',
        label: 'Backend Extra Charges',
        values: {
          Sedan: { perHour: 200, perKm: 10 },
          SUV: { perHour: 300, perKm: 12 },
          Innova: { perHour: 350, perKm: 15 },
          Luxury: { perHour: 700, perKm: 25 }
        },
        updatedBy: new mongoose.Types.ObjectId("6864cb6722a4224a7fb0d9ed")
      }
    ];

    await Setting.insertMany(settings);
    console.log('✅ Settings seeded successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedSettings();
