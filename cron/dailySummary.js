// cron/dailySummary.js
import cron from 'node-cron';
import { Resend } from 'resend';
import Duty from '../models/Duty.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendDailySummary = async () => {
  try {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const duties = await Duty.find({
      status: 'completed',
      endTime: { $gte: start, $lte: end },
    });

    let html = `
      <h2>Daily Transport Summary (${new Date().toLocaleDateString('en-IN')})</h2>
    `;

    if (!duties.length) {
      html += `<p><strong>No completed duties today.</strong></p>`;
    } else {
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

      html += `
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
    }

    await resend.emails.send({
      from: 'Transport System <onboarding@resend.dev>',
      to: process.env.EMAIL_TO,
      subject: 'Daily Transport Duty Summary',
      html,
    });

    console.log('✅ Daily summary sent via Resend.');
  } catch (err) {
    console.error('❌ Failed to send daily summary via Resend:', err);
  }
};

export const startDailySummaryJob = () => {
  cron.schedule('29 18 * * *', sendDailySummary); // Runs at 23:59 every night
};
