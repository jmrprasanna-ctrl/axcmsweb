const drawyerService = require("../services/drawyerService");

exports.getDrawyerFiles = async (req, res) => {
  try {
    const payload = await drawyerService.listDrawyer(req, { forceSync: false });
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load Drawyer files." });
  }
};
