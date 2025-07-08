import cron from 'node-cron';
import nodemailer from 'nodemailer';
import Duty from '../models/Duty.js';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendDailySummary = async () => {
  try {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const duties = await Duty.find({
      status: 'completed',
      endTime: { $gte: start, $lte: end },
    });

    if (!duties.length) return;

    let guestTotal = 0;
    let backendTotal = 0;

    const rows = duties.map((duty) => {
      guestTotal += duty.guestCharge?.total || 0;
      backendTotal += duty.backendCharge?.total || 0;
      return `<tr>
        <td>${duty.tripID}</td>
        <td>${duty.guestName}</td>
        <td>${duty.vehicleType}</td>
        <td>₹${duty.guestCharge?.total?.toFixed(2)}</td>
        <td>₹${duty.backendCharge?.total?.toFixed(2)}</td>
      </tr>`;
    });

    const html = `
      <h2>Daily Transport Summary (${new Date().toLocaleDateString('en-IN')})</h2>
      <p>Total Duties: ${duties.length}</p>
      <p>Guest Revenue: ₹${guestTotal.toFixed(2)}</p>
      <p>Backend Cost: ₹${backendTotal.toFixed(2)}</p>
      <p><strong>Profit: ₹${(guestTotal - backendTotal).toFixed(2)}</strong></p>

      <table border="1" cellpadding="5" cellspacing="0">
        <thead>
          <tr>
            <th>Trip ID</th>
            <th>Guest</th>
            <th>Vehicle</th>
            <th>Guest ₹</th>
            <th>Backend ₹</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;

    await transporter.sendMail({
      from: `"Transport System" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: 'Daily Transport Duty Summary',
      html,
    });

    console.log('✅ Daily summary sent.');
  } catch (err) {
    console.error('❌ Failed to send daily summary:', err);
  }
};

export const startDailySummaryJob = () => {
  cron.schedule('59 23 * * *', sendDailySummary); // Runs at 23:59 every night
};
