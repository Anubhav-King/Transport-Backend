// scripts/fixSingleDutyGuestCharge.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Duty from "./models/Duty.js";
import calculateCharges from "./utils/calculateCharges.js";

dotenv.config();

await mongoose.connect(
  "mongodb+srv://King:King%402025@transport-db.8el6k4m.mongodb.net/?retryWrites=true&w=majority&appName=Transport-DB"
);
console.log("Connected to MongoDB");

const dutyId = "686a11521b374eb97ad028b2";

const fixDuty = async () => {
  const duty = await Duty.findById(dutyId);
  if (!duty) return console.log("Duty not found");

  // Fix verifiedExpenses to add missing label field
  if (duty.verifiedExpenses && duty.verifiedExpenses.length > 0) {
    const categoryToLabel = {
      parking: "parking",
      fuel: "fuel",
      misc: "misc",
    };

    duty.verifiedExpenses = duty.verifiedExpenses.map((ve) => {
      if (!ve.label) {
        return { ...ve.toObject(), label: categoryToLabel[ve.category] || "misc" };
      }
      return ve;
    });
  }

  // Recalculate charges with corrected context
  const { guestCharge, backendCharge, originalGuestCharge } = await calculateCharges({
    dutyType: duty.dutyType,
    vehicleType: duty.vehicleType,
    packageCode: duty.packageCode,
    additionalKm: duty.additionalKm,
    additionalHours: duty.additionalHours,
    discountPercentage: duty.discountPercentage,
    applyDiscount: true,
    verifiedExpenses: duty.verifiedExpenses,
    charges: duty.charges,
  });

  duty.guestCharge = guestCharge;
  duty.backendCharge = backendCharge;
  duty.originalCharges = {
    guest: originalGuestCharge,
    backend: backendCharge,
  };

  await duty.save();
  console.log("Duty charges updated successfully.");
  process.exit();
};

fixDuty();
