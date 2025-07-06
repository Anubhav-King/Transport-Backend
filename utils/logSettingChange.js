import SettingLog from '../models/SettingLog.js';

export const logSettingChange = async ({ key, action, updatedBy, changes }) => {
  try {
    await SettingLog.create({ key, action, updatedBy, changes });
  } catch (err) {
    console.error('Failed to log setting change:', err);
  }
};
