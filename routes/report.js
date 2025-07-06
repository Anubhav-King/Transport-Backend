import express from 'express';
import Duty from '../models/Duty.js';
import verifyToken from '../middleware/auth.js';
import dayjs from 'dayjs';

const router = express.Router();

const getDateRange = (range) => {
  const now = dayjs();
  switch (range) {
    case 'today':
      return {
        start: now.startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      };
    case 'yesterday':
      const yest = now.subtract(1, 'day');
      return {
        start: yest.startOf('day').toDate(),
        end: yest.endOf('day').toDate(),
      };
    case 'mtd':
      return {
        start: now.startOf('month').toDate(),
        end: now.endOf('day').toDate(),
      };
    case 'ytd':
      return {
        start: now.startOf('year').toDate(),
        end: now.endOf('day').toDate(),
      };
    default:
      return null;
  }
};

router.get('/', verifyToken, async (req, res) => {
  const { range, dutyType, package: packageName, carType } = req.query;

  if (!range) {
    return res.status(400).json({ message: 'Missing required "range" query param' });
  }

  const dateRange = getDateRange(range);
  if (!dateRange) {
    return res.status(400).json({ message: 'Invalid "range" value' });
  }

  const query = {
    status: 'completed',
    pickupDateTime: { $gte: dateRange.start, $lte: dateRange.end },
  };

  if (dutyType) query.dutyType = dutyType;
  if (carType) query.vehicleType = carType;
  if (packageName && dutyType === 'Local Use') query.packageName = packageName;

  try {
    const duties = await Duty.find(query);

    const summary = duties.map((duty) => ({
      date: dayjs(duty.pickupDate).format('DD-MM-YYYY'),
      dutyType: duty.dutyType,
      vehicleType: duty.vehicleType,
      packageName: duty.packageName || '',
      guestCharge: duty.guestCharge?.total || 0,
      backendCharge: duty.backendCharge?.total || 0,
    }));

    const totals = {
      byDutyType: {},
      grandTotal: {
        guestTotal: 0,
        backendTotal: 0,
        profit: 0,
      },
    };

    for (const duty of summary) {
      const { dutyType, guestCharge, backendCharge } = duty;

      if (!totals.byDutyType[dutyType]) {
        totals.byDutyType[dutyType] = {
          guestTotal: 0,
          backendTotal: 0,
          profit: 0,
        };
      }

      totals.byDutyType[dutyType].guestTotal += guestCharge;
      totals.byDutyType[dutyType].backendTotal += backendCharge;
      totals.byDutyType[dutyType].profit += guestCharge - backendCharge;

      totals.grandTotal.guestTotal += guestCharge;
      totals.grandTotal.backendTotal += backendCharge;
      totals.grandTotal.profit += guestCharge - backendCharge;
    }

    res.json({ summary, totals });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

export default router;
