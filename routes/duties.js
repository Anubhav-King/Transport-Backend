import express from "express";
import Duty from "../models/Duty.js";
import verifyToken from "../middleware/auth.js";
import calculateCharges from "../utils/calculateCharges.js";
import multer from "multer";
import path from "path";
import Setting from "../models/Setting.js"
import TripCounter from "../models/TripCounter.js";
import logActivity from '../utils/logActivity.js';


// Utility to generate sequential Trip ID
const generateTripID = async () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yy = String(today.getFullYear()).slice(-2); // ← Always gives '25' for 2025
  const ddmmyy = `${dd}${mm}${yy}`;

  let counter = await TripCounter.findOne({ date: ddmmyy });
  if (!counter) {
    counter = new TripCounter({ date: ddmmyy, count: 1 });
  } else {
    counter.count += 1;
  }

  await counter.save();

  const countStr = counter.count.toString().padStart(2, "0");
  return `TR/${countStr}/${ddmmyy}`;
};

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

// Cancel a duty
router.patch("/:id/cancel", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ message: "Cancellation reason required" });

  try {
    const duty = await Duty.findById(id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    duty.status = "cancelled";
    duty.statusHistory.push({ status: 'cancelled', timestamp: new Date() });
    duty.cancellationReason = reason;
    await duty.save();

    // ✅ Log before responding
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: `Cancelled duty (Reason: ${reason})`,
      dutyId: duty._id,
    });

    res.json({ message: "Duty cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error cancelling duty" });
  }
});


// Assign Car & Chauffeur
router.patch("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { carNumber, chauffeurName } = req.body;

  try {
    const duty = await Duty.findById(id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    if (!["pending", "active"].includes(duty.status)) {
      return res.status(400).json({ message: `Cannot update duty with status: ${duty.status}` });
    }

    const previousCar = duty.carNumber;
    const previousChauffeur = duty.chauffeurName;

    if ('carNumber' in req.body) duty.carNumber = carNumber;
    if ('chauffeurName' in req.body) duty.chauffeurName = chauffeurName;
    if (!carNumber && !chauffeurName) {
      duty.status = "pending";
      duty.statusHistory.push({ status: "pending", timestamp: new Date() });
    }


    // If both assigned and status is still pending, move to active
    if (carNumber && chauffeurName && duty.status === "pending") {
      duty.status = "active";
      duty.statusHistory.push({ status: "active", timestamp: new Date() });
    }

    await duty.save();

    // ✅ Optional: Log assignment change
    let action = `Updated car/chauffeur assignment`;
    if (previousCar !== carNumber || previousChauffeur !== chauffeurName) {
      action = `Assigned Car: ${carNumber}, Chauffeur: ${chauffeurName}`;
    }

    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action,
      dutyId: duty._id,
    });

    res.json({ message: "Duty updated successfully", duty });
  } catch (err) {
    console.error("Duty update error:", err);
    res.status(500).json({ message: "Error updating duty" });
  }
});


// Start Trip
router.patch("/:id/start", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { startKm } = req.body;

  if (!startKm) return res.status(400).json({ message: "Start KM is required" });

  try {
    const duty = await Duty.findById(id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    duty.startTime = new Date();
    duty.startKm = parseFloat(startKm);
    duty.status = 'in-progress';
    duty.statusHistory.push({ status: 'in-progress', timestamp: new Date() });

    await duty.save();

    res.json({ message: "Trip started", startTime: duty.startTime });
  } catch (err) {
    console.error("Error starting trip:", err);
    res.status(500).json({ message: "Error starting trip" });
  }
});

// routes/dutyRoutes.js
router.patch("/:id/end-trip", verifyToken, upload.any(), async (req, res) => {
  const { id } = req.params;
  const { startKm, endKm, startTime, endTime } = req.body;

  if (!startKm || !endKm || isNaN(startKm) || isNaN(endKm)) {
    return res.status(400).json({ message: "Invalid or missing startKm / endKm" });
  }

  if (!startTime || !endTime || isNaN(new Date(startTime)) || isNaN(new Date(endTime))) {
    return res.status(400).json({ message: "Invalid or missing startTime / endTime" });
  }

  try {
    const duty = await Duty.findById(id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    const actualDurationMs = new Date(endTime) - new Date(startTime);
    const actualHoursUsed = Math.ceil(actualDurationMs / (1000 * 60 * 60));
    const actualKmsUsed = parseFloat(endKm) - parseFloat(startKm);

    // Get included hours and kms for Local Use
    let includedHours = 0;
    let includedKms = 0;

    if (duty.dutyType === "Local Use") {
      const setting = await Setting.findOne({ key: "localUsePackages" });
      const pkg = setting?.values?.find(p => p.label === duty.packageCode);
      if (pkg) {
        includedHours = pkg.hours || 0;
        includedKms = pkg.kms || 0;
      }
    }

    const additionalHours = Math.max(0, actualHoursUsed - includedHours);
    const additionalKm = Math.max(0, actualKmsUsed - includedKms);

    const parseExpense = (type) => {
      const enabled = req.body[`${type}Enabled`] === "true";
      if (!enabled) return { enabled: false, entries: [] };

      const entries = [];
      const entryCount = parseInt(req.body[`${type}Count`] || "0");

      for (let i = 0; i < entryCount; i++) {
        const amount = req.body[`${type}Amount_${i}`];
        const remark = req.body[`${type}Remark_${i}`] || "";
        const imageField = `${type}Image_${i}`;
        const file = req.files?.find((f) => f.fieldname === imageField);

        if (!amount || isNaN(amount)) {
          throw new Error(`Missing or invalid amount for ${type} expense at index ${i}`);
        }

        if (!file) {
          throw new Error(`Missing file ${imageField} for ${type} expense at index ${i}`);
        }

        entries.push({ amount: Number(amount), remark, image: file.filename });
      }

      return { enabled: true, entries };
    };

    const parking = parseExpense("parking");
    const fuel = parseExpense("fuel");
    const misc = parseExpense("misc");

    const totalExpenses = [...parking.entries, ...fuel.entries, ...misc.entries]
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate charges using utility
    const { guestCharge, backendCharge, originalGuestCharge } = await calculateCharges({
      dutyType: duty.dutyType,
      vehicleType: duty.vehicleType,
      packageCode: duty.packageCode,
      additionalKm,
      additionalHours,
      discountPercentage: duty.discountPercentage || 0,
      applyDiscount: true,
      charges: duty.charges
    });

    duty.startTime = startTime;
    duty.endTime = endTime;
    duty.startKm = Number(startKm);
    duty.endKm = Number(endKm);
    duty.additionalHours = additionalHours;
    duty.additionalKm = additionalKm;

    duty.status = "pending-verification-transport";
    duty.statusHistory.push({ status: "pending-verification-transport", timestamp: new Date() });

    duty.expenses = { parking, fuel, misc };
    duty.additionalExpenses = totalExpenses;
    duty.guestCharge = guestCharge;
    duty.backendCharge = backendCharge;
    duty.originalCharges = { ...duty.originalCharges, guest: originalGuestCharge };

    await duty.save();
    res.json({ message: "Trip ended successfully", duty });
  } catch (err) {
    console.error("End trip error:", err);
    res.status(500).json({ message: err.message || "Error ending trip" });
  }
});

// routes/duties.js
router.patch("/verify-transport/:id", verifyToken, async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    const {
      additionalKm = 0,
      additionalHours = 0,
      discountPercentage = 0,
      discountRemark = '',
      verifiedExpenses = [],
      additionalChargesRemark = {},
    } = req.body;

    const addKm = parseFloat(additionalKm);
    const addHours = parseFloat(additionalHours);
    const discount = parseFloat(discountPercentage);

    // Step 1: Get or compute the original guest charge (no discount)
    let originalGuestCharge = duty.originalCharges?.guest;

    if (!originalGuestCharge || !originalGuestCharge.base) {
      const { guestCharge: originalGuest, backendCharge: originalBackend } = await calculateCharges({
        dutyType: duty.dutyType,
        packageCode: duty.packageCode,
        vehicleType: duty.vehicleType,
        additionalKm: 0,
        additionalHours: 0,
        charges: duty.charges,
      });

      originalGuestCharge = originalGuest;
      duty.originalCharges = {
        guest: originalGuest,
        backend: originalBackend,
      };
    }

    // Step 2: Recalculate with verifiedExpenses, discount, and usage
    const { guestCharge, backendCharge } = await calculateCharges({
      dutyType: duty.dutyType,
      packageCode: duty.packageCode,
      vehicleType: duty.vehicleType,
      additionalKm: addKm,
      additionalHours: addHours,
      discountPercentage: discount,
      applyDiscount: true,
      verifiedExpenses,
      charges: duty.charges,
    });

    // Step 3: Save all details to the duty
    duty.additionalKm = addKm;
    duty.additionalHours = addHours;
    duty.discountPercentage = discount;
    duty.discountRemark = discountRemark;
    duty.verifiedExpenses = verifiedExpenses;
    duty.additionalChargesRemark = additionalChargesRemark;

    duty.guestCharge = guestCharge;
    duty.backendCharge = backendCharge;
    duty.discountedPrice = guestCharge.total;

    duty.status = 'pending-verification-concierge';
    duty.statusHistory.push({ status: 'pending-verification-concierge', timestamp: new Date() });

    await duty.save();

    // ✅ Log the verification
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: `Verified Transport Duty ${duty.tripID || duty._id}`,
      dutyId: duty._id,
    });

    res.json({ message: 'Verified by Transport', duty });
  } catch (err) {
    console.error('Transport verification error:', err);
    res.status(500).json({ message: 'Transport verification failed' });
  }
});


router.patch("/verify-concierge/:id", verifyToken, async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    if (duty.status !== 'pending-verification-concierge') {
      return res.status(400).json({ message: 'Invalid status for concierge verification' });
    }

    const {
      discountPercentage = 0,
      discountRemark = '',
    } = req.body;

    const discount = parseFloat(discountPercentage);

    // Step 1: Ensure original guest charge exists
    let originalGuestCharge = duty.originalCharges?.guest;

    if (!originalGuestCharge || !originalGuestCharge.base) {
      const { guestCharge: originalGuest, backendCharge: originalBackend } = await calculateCharges({
        dutyType: duty.dutyType,
        packageCode: duty.packageCode,
        vehicleType: duty.vehicleType,
        additionalKm: 0,
        additionalHours: 0,
        charges: duty.charges,
      });

      originalGuestCharge = originalGuest;
      duty.originalCharges = {
        guest: originalGuest,
        backend: originalBackend,
      };
    }

    // Step 2: Recalculate updated charges with discount
    const { guestCharge, backendCharge } = await calculateCharges({
      dutyType: duty.dutyType,
      packageCode: duty.packageCode,
      vehicleType: duty.vehicleType,
      additionalKm: duty.additionalKm || 0,
      additionalHours: duty.additionalHours || 0,
      discountPercentage: discount,
      applyDiscount: true,
      verifiedExpenses: duty.verifiedExpenses || [],
      charges: duty.charges,
    });

    // Step 3: Save updated data
    duty.discountPercentage = discount;
    duty.discountRemark = discountRemark;

    duty.guestCharge = guestCharge;
    duty.backendCharge = backendCharge;
    duty.discountedPrice = guestCharge.total;

    duty.status = 'completed';
    duty.statusHistory.push({ status: 'completed', timestamp: new Date() });

    await duty.save();

    // ✅ Log activity
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: `Verified & Completed Duty ${duty.tripID || duty._id}`,
      dutyId: duty._id,
    });

    res.json({ message: 'Verified by Concierge. Duty marked as completed.', duty });
  } catch (err) {
    console.error('Concierge verification error:', err);
    res.status(500).json({ message: 'Concierge verification failed' });
  }
});


// Create New Duty

router.post("/", verifyToken, async (req, res) => {
  try {
    const createdBy = req.user.id;

    const {
      guestName,
      guestMobile,
      guestType,           // ✅ Add this
      roomNumber,          // ✅ Add this
      mobileNumber,
      dutyType,
      pickupDateTime,
      pickupLocation,
      dropLocation,
      vehicleType,
      packageCode,
      specialRequest,
      carNumber,
      chauffeurName,
      discountPercentage = 0,
      discountRemark = "",
      charges = "Chargeable",
    } = req.body;

    if (!guestName || !dutyType || !vehicleType || !pickupDateTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Calculate charges based on duty type, discount, and charges type
    const { guestCharge, backendCharge, originalGuestCharge } = await calculateCharges({
      dutyType,
      vehicleType,
      packageCode,
      discountPercentage,
      applyDiscount: discountPercentage > 0 && charges === "Chargeable",
      charges,
    });

    // ✅ Generate trip ID
    const tripID = await generateTripID();

    const discountedPrice = guestCharge.total;

    const newDuty = new Duty({
      guestName,
      guestMobile,
      guestType,           // ✅ Add this
      roomNumber,          // ✅ Add this
      mobileNumber,
      dutyType,
      pickupDateTime,
      pickupLocation,
      dropLocation,
      vehicleType,
      packageCode,
      specialRequest,
      carNumber,
      chauffeurName,
      guestCharge,
      backendCharge,
      originalCharges: {
        guest: originalGuestCharge,
        backend: backendCharge,
      },
      discountPercentage,
      discountRemark,
      discountedPrice,
      charges,
      tripID,
      createdBy,
      status: "pending",
      statusHistory: [{ status: "pending", timestamp: new Date() }],
    });

    await newDuty.save();

    // ✅ Log activity
    await logActivity({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: `Created new duty for ${guestName} (${tripID})`,
      dutyId: newDuty._id,
    });

    res.status(201).json({ message: "Duty created successfully", duty: newDuty });
  } catch (err) {
    console.error("Duty Save Error:", err);
    res.status(500).json({ message: "Server error while saving duty" });
  }
});


// Recalculate Charges (used in verify modal save button)
router.post("/calculate-charges/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      additionalKm = 0,
      additionalHours = 0,
      discountPercentage = 0,
      discountRemark = "",
      applyDiscount = false,
      verifiedExpenses = [],
    } = req.body;

    const duty = await Duty.findById(id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    const parsedKm = parseFloat(additionalKm) || 0;
    const parsedHr = parseFloat(additionalHours) || 0;
    const parsedDiscount = parseFloat(discountPercentage) || 0;

    // ✅ Update individual expense entries with .split
    verifiedExpenses.forEach(({ label, type, amount }) => {
      const entries = duty.expenses?.[label]?.entries || [];
      let remaining = amount;

      for (const entry of entries) {
        if (entry.split || !remaining) continue;

        if (Math.abs(entry.amount - remaining) < 0.01 || entry.amount <= remaining + 0.01) {
          entry.split = type;
          remaining -= entry.amount;
        }
      }
    });

    // ✅ Save verifiedExpenses and adjustments
    duty.verifiedExpenses = verifiedExpenses;
    duty.additionalKm = parsedKm;
    duty.additionalHours = parsedHr;
    duty.discountPercentage = parsedDiscount;
    duty.discountRemark = discountRemark;

    // ✅ Pass charges type to calculation
    const { guestCharge, backendCharge, originalGuestCharge } = await calculateCharges({
      dutyType: duty.dutyType,
      vehicleType: duty.vehicleType,
      packageCode: duty.packageCode,
      additionalKm: parsedKm,
      additionalHours: parsedHr,
      discountPercentage: parsedDiscount,
      applyDiscount,
      verifiedExpenses,
      charges: duty.charges, // ✅ CRUCIAL
    });

    duty.guestCharge = guestCharge;
    duty.backendCharge = backendCharge;
    duty.originalCharges = { guest: originalGuestCharge };
    duty.discountedPrice = guestCharge.total;

    await duty.save();

    res.json(duty);
  } catch (err) {
    console.error("Charge recalculation error:", err);
    res.status(500).json({ message: "Failed to calculate charges" });
  }
});





// Fetch Duties
router.get("/", verifyToken, async (req, res) => {
  try {
    const role = req.user.role;
    const name = req.user.name;

    if (role === 'Chauffeur') {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const duties = await Duty.find({
        chauffeurName: name,
        $or: [
          { status: { $in: ['active', 'in-progress'] } },
          {
            status: 'completed',
            pickupDateTime: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        ],
      }).sort({ pickupDateTime: 1 });

      return res.json(duties);
    }

    const duties = await Duty.find().sort({ createdAt: -1 });
    res.json(duties);
  } catch (err) {
    console.error("Error fetching duties:", err);
    res.status(500).json({ error: "Failed to fetch duties" });
  }
});

// Get Duty by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: 'Duty not found' });

    res.json(duty);
  } catch (err) {
    console.error('Error fetching duty by ID:', err);
    res.status(500).json({ message: 'Failed to load duty' });
  }
});

// Recalculate charges for a specific duty by ID
router.patch("/recalculate/:id", verifyToken, async (req, res) => {
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) return res.status(404).json({ message: "Duty not found" });

    const { guestCharge, backendCharge, originalGuestCharge } = await calculateCharges({
      dutyType: duty.dutyType,
      vehicleType: duty.vehicleType,
      packageCode: duty.packageCode,
      additionalKm: duty.additionalKm || 0,
      additionalHours: duty.additionalHours || 0,
      discountPercentage: duty.discountPercentage || 0,
      applyDiscount: duty.discountPercentage > 0,
      charges: duty.charges
    });

    duty.guestCharge = guestCharge;
    duty.backendCharge = backendCharge;
    duty.originalCharges = {
      ...duty.originalCharges,
      guest: originalGuestCharge,
    };
    duty.discountedPrice = guestCharge.total;

    await duty.save();

    res.json({ message: "Charges recalculated", duty });
  } catch (err) {
    console.error("Recalculation error:", err);
    res.status(500).json({ message: "Failed to recalculate charges" });
  }
});


export default router;