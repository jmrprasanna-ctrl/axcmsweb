const drawyerService = require("../services/drawyerService");

exports.getDrawyerFiles = async (req, res) => {
  try {
    const payload = await drawyerService.listDrawyer(req, { forceSync: false });
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to load Drawyer files." });
  }
};

exports.downloadDrawyerFile = async (req, res) => {
  try {
    const caseNo = String(req.query.case_no || "").trim();
    const moduleName = String(req.query.module || "").trim();
    const index = Number(req.query.index || 0);
    if (!caseNo) {
      return res.status(400).json({ message: "Case number is required." });
    }
    if (!moduleName) {
      return res.status(400).json({ message: "Module is required." });
    }
    if (!Number.isFinite(index) || index < 0) {
      return res.status(400).json({ message: "Invalid file index." });
    }

    const entry = await drawyerService.getDrawyerFileEntry(caseNo, moduleName, index);
    if (!entry) {
      return res.status(404).json({ message: "File not found." });
    }

    res.setHeader("Content-Type", entry.mime || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${entry.file_name.replace(/"/g, "\"")}"`);
    res.send(entry.buffer);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to download file." });
  }
};
