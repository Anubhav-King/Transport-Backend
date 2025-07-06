import express from "express";
import Setting from "../models/Setting.js";
import SettingLog from "../models/SettingLog.js"; // ⬅️ NEW
import { logSettingChange } from "../utils/logSettingChange.js"; // ⬅️ NEW
import verifyToken, { isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get all settings
router.get('/all', async (req, res) => {
  try {
    const setting = await Setting.find();
    if (!setting) return res.status(404).json({ message: 'Settings not found' });
    res.json(setting);
  } catch (err) {
    console.error('❌ Error fetching settings:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get setting logs
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const logs = await SettingLog.find({})
      .sort({ timestamp: -1 })
      .limit(200)
      .populate('updatedBy', 'name');
    res.json(logs);
  } catch (err) {
    console.error('Error fetching setting logs:', err);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

// Get one setting by key
router.get("/:key", verifyToken, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: "Setting not found" });
    res.json(setting);
  } catch (err) {
    console.error("Settings GET key error:", err);
    res.status(500).json({ message: "Failed to fetch setting" });
  }
});

// ✅ Create a new setting
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { key, label, values } = req.body;
    const existing = await Setting.findOne({ key });
    if (existing) return res.status(400).json({ message: "Key already exists" });

    const newSetting = new Setting({
      key,
      label,
      values,
      updatedBy: req.user.id,
    });

    await newSetting.save();

    await logSettingChange({
      key,
      action: "create",
      updatedBy: req.user.id,
      changes: { from: null, to: values },
    });

    res.status(201).json({ message: "Setting created", setting: newSetting });
  } catch (err) {
    console.error("Settings POST error:", err);
    res.status(500).json({ message: "Failed to create setting" });
  }
});

// ✅ Update setting
router.patch("/:key", verifyToken, isAdmin, async (req, res) => {
  try {
    const { values } = req.body;
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: "Setting not found" });

    const oldValues = setting.values;
    setting.values = values;
    setting.updatedBy = req.user.id;
    await setting.save();

    await logSettingChange({
      key: setting.key,
      action: "update",
      updatedBy: req.user.id,
      changes: { from: oldValues, to: values },
    });

    res.json({ message: "Setting updated", setting });
  } catch (err) {
    console.error("Settings PATCH error:", err);
    res.status(500).json({ message: "Failed to update setting" });
  }
});

// ✅ Delete setting
router.delete("/:key", verifyToken, isAdmin, async (req, res) => {
  try {
    const setting = await Setting.findOneAndDelete({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: "Setting not found" });

    await logSettingChange({
      key: setting.key,
      action: "delete",
      updatedBy: req.user.id,
      changes: { from: setting.values, to: null },
    });

    res.json({ message: "Setting deleted" });
  } catch (err) {
    console.error("Settings DELETE error:", err);
    res.status(500).json({ message: "Failed to delete setting" });
  }
});

export default router;
