import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import settingsRoutes from './routes/settings.js';
import authRoutes from './routes/auth.js';
import dutyTypeRoutes from './routes/dutytype.js';
import dutyRoutes from './routes/duties.js';
import fleetRoutes from './routes/fleet.js'; // ⬅️ Add this line
import reportRoutes from './routes/report.js';
import { startDailySummaryJob } from './cron/dailySummary.js';
import adminRoutes from './routes/adminRoutes.js';
//import RoleChangeLog from "../models/RoleChangeLog.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dutytypes', dutyTypeRoutes);
app.use('/api/duties', dutyRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/fleet', fleetRoutes); // ⬅️ Add this line after other routes
app.use("/api/settings", settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
//app.use('/api/role-change-logs', RoleChangeLog)


// Connect DB and Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => {
    console.log('✅ Server running on port 5000');
  }))
  .catch((err) => console.error('❌ DB Connection Error:', err));

startDailySummaryJob();