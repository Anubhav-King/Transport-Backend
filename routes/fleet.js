// routes/fleet.js
import express from 'express';
import verifyToken from '../middleware/auth.js';
import Car from '../models/Car.js';
import User from '../models/User.js';
import AvailabilityLog from '../models/AvailabilityLog.js';

const router = express.Router();

// --- Existing Car Routes (unchanged) ---
router.post('/cars', verifyToken, async (req, res) => {
  try {
    const { carNumber, vehicleType, fixedChauffeur } = req.body;
    const car = await Car.create({ carNumber, vehicleType, fixedChauffeur });
    res.status(201).json(car);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/cars', verifyToken, async (req, res) => {
  const cars = await Car.find().sort({ carNumber: 1 });
  res.json(cars);
});

router.delete('/cars/:carNumber', verifyToken, async (req, res) => {
  const { carNumber } = req.params;
  await Car.deleteOne({ carNumber });
  res.json({ message: 'Car deleted' });
});

// --- NEW: Combined Availability Fetch (Cars + Chauffeurs) ---
router.get('/availability', verifyToken, async (req, res) => {
  try {
    const cars = await Car.find({}, 'carNumber vehicleType available reason fixedChauffeur');
    const chauffeurs = await User.find({ role: 'Chauffeur' }, 'name available reason');

    res.json({ cars, chauffeurs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// --- NEW: Combined Availability Update ---
router.patch('/availability', verifyToken, async (req, res) => {
  try {
    const userName = req.user.name;
    const updates = req.body; // [{ type: 'car'/'chauffeur', id, available, reason }]

    const results = [];

    for (const entry of updates) {
      const { type, id, available, reason } = entry;

      if (type === 'car') {
        const car = await Car.findById(id);
        if (!car) continue;

        car.available = available;
        car.reason = available ? null : reason;
        await car.save();

        await AvailabilityLog.create({
          carNumber: car.carNumber,
          vehicleType: car.vehicleType,
          chauffeurName: car.fixedChauffeur || null,
          available,
          reason: available ? '' : reason,
          updatedBy: userName,
        });

        results.push({ type: 'car', id, status: 'updated' });

      } else if (type === 'chauffeur') {
        const user = await User.findById(id);
        if (!user || user.role !== 'Chauffeur') continue;

        user.available = available;
        user.reason = available ? null : reason;
        await user.save();

        await AvailabilityLog.create({
          carNumber: null,
          vehicleType: null,
          chauffeurName: user.name,
          available,
          reason: available ? '' : reason,
          updatedBy: userName,
        });

        results.push({ type: 'chauffeur', id, status: 'updated' });
      }
    }

    res.json({ message: 'Availability updated', results });
  } catch (err) {
    console.error('❌ PATCH /availability Error:', err); // <-- Add this
    res.status(500).json({ error: 'Update failed', details: err.message }); // <-- optional
  }
});

// Daily logs (unchanged)
router.get('/logs', verifyToken, async (req, res) => {
  const { date } = req.query;
  const start = new Date(date);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const logs = await AvailabilityLog.find({
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: -1 });

  res.json(logs);
});

export default router;
