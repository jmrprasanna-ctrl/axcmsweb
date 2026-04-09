const googleDriveService = require("../services/googleDriveService");
const drawyerService = require("../services/drawyerService");

exports.getSettings = async (req, res) => {
  try {
    const row = await googleDriveService.getSettings(req);
    res.json(googleDriveService.toClientSettings(row || {}));
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load Google Drive settings." });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const data = await googleDriveService.saveSettings(req, req.body || {});
    res.json({ message: "Google Drive settings saved.", settings: data });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to save Google Drive settings." });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const current = await googleDriveService.getSettings(req);
    const merged = {
      ...current,
      ...(req.body || {}),
    };
    const token = await googleDriveService.refreshAccessToken(merged);
    if (!token) {
      return res.status(400).json({ message: "Google token is invalid." });
    }
    res.json({ ok: true, message: "Google Drive connection successful." });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message || "Google Drive connection failed." });
  }
};

exports.syncNow = async (req, res) => {
  try {
    const payload = await drawyerService.listDrawyer(req, { forceSync: true });
    res.json({
      message: "Drive sync completed.",
      sync: payload.sync,
      cases: payload.cases,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to sync to Google Drive." });
  }
};
