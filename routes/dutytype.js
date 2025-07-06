import express from 'express';
import DutyType from '../models/DutyType.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const duties = await DutyType.find();
  res.json(duties);
});

router.post('/', verifyToken, async (req, res) => {
  const duty = new DutyType(req.body);
  await duty.save();
  res.json(duty);
});

export default router;
