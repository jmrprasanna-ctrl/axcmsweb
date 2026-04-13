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
    res.setHeader("Content-Disposition", `attachment; filename="${String(entry.file_name || "file").replace(/"/g, "\"")}"`);
    res.send(entry.buffer);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to download file." });
  }
};

exports.deleteDrawyerFile = async (req, res) => {
  try {
    const caseNo = String(req.query.case_no || "").trim();
    const moduleName = String(req.query.module || "").trim();
    const sourceTable = String(req.query.source_table || "").trim();
    const sourceId = Number(req.query.source_id || 0);
    const fileIndex = Number(req.query.file_index || 0);

    if (!caseNo) {
      return res.status(400).json({ message: "Case number is required." });
    }
    if (!moduleName) {
      return res.status(400).json({ message: "Module is required." });
    }
    if (!sourceTable) {
      return res.status(400).json({ message: "Source table is required." });
    }
    if (!Number.isFinite(sourceId) || sourceId <= 0) {
      return res.status(400).json({ message: "Invalid source id." });
    }
    if (!Number.isFinite(fileIndex) || fileIndex < 0) {
      return res.status(400).json({ message: "Invalid file index." });
    }

    await drawyerService.deleteDrawyerFile(moduleName, sourceTable, sourceId, fileIndex);
    res.json({ message: "File deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete file." });
  }
};
