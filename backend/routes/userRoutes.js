const express = require("express");
const { getUsers, getUserById, addUser, updateUser, deleteUser } = require("../controllers/userController");
const {
  getAccessUsers,
  getAccessPages,
  getDatabases,
  createDatabase,
  getCreatedDatabases,
  deleteDatabase,
  getCompanies,
  createCompany,
  deleteCompany,
  getMappedMeta,
  getMappedByUser,
  verifyMapping,
  saveMapping,
  getInvMapByUser,
  listInvMapEntries,
  deleteInvMapEntry,
  verifyInvMap,
  saveInvMap,
  getMyInvMap,
  saveMyQuotation2RenderVisibility,
  saveMyQuotation3RenderVisibility,
  getUserAccess,
  saveUserAccess,
  getMyAccess
} = require("../controllers/userAccessController");
const { getLoginLogs, clearLoginLogs } = require("../controllers/userLogController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");

const router = express.Router();

router.use(authMiddleware);

router.get("/assignable", roleMiddleware(["admin","manager","user"]), getUsers);
router.get("/access/me", getMyAccess);
router.get("/inv-map/me", roleMiddleware(["admin","manager","user"]), getMyInvMap);
router.put("/inv-map/me/quotation2-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation2RenderVisibility);
router.put("/inv-map/me/quotation3-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation3RenderVisibility);

router.use(roleMiddleware(["admin"]));

router.get("/access-users", getAccessUsers);
router.get("/access-pages", getAccessPages);
router.get("/databases", getDatabases);
router.post("/databases/create", createDatabase);
router.get("/databases/created", getCreatedDatabases);
router.delete("/databases/:databaseName", deleteDatabase);
router.get("/companies", getCompanies);
router.post("/companies/create", createCompany);
router.delete("/companies/:companyId", deleteCompany);
router.get("/mapped/meta", getMappedMeta);
router.get("/mapped/:userId", getMappedByUser);
router.post("/mapped/verify", verifyMapping);
router.post("/mapped/save", saveMapping);
router.get("/inv-map/entries", listInvMapEntries);
router.delete("/inv-map/entries/:entryId", deleteInvMapEntry);
router.get("/inv-map/:userId", getInvMapByUser);
router.post("/inv-map/verify", verifyInvMap);
router.post("/inv-map/save", saveInvMap);
router.get("/logs", getLoginLogs);
router.delete("/logs", clearLoginLogs);
router.get("/access/:userId", getUserAccess);
router.put("/access/:userId", saveUserAccess);

// Backward-compatible profile endpoints expected by frontend profile pages.
router.get("/profiles", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "email", "company", "department", "telephone"],
      order: [["id", "DESC"]],
    });
    const rows = (Array.isArray(users) ? users : []).map((u) => ({
      id: u.id,
      profile_name: u.username || "",
      email: u.email || "",
      login_user: u.username || "",
      company_name: u.company || "",
      department: u.department || "",
      mobile: u.telephone || "",
      telephone: u.telephone || "",
      profile_picture_url: null,
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profiles/user-options", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "email"],
      order: [["id", "DESC"]],
    });
    const rows = (Array.isArray(users) ? users : []).map((u) => ({
      id: u.id,
      username: u.username || "",
      email: u.email || "",
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profiles/user-by-email", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();
    if (!email) return res.status(400).json({ message: "email is required" });
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user.id,
      profile_name: user.username || "",
      email: user.email || "",
      login_user: user.username || "",
      company_name: user.company || "",
      department: user.department || "",
      mobile: user.telephone || "",
      telephone: user.telephone || "",
      profile_picture_url: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profiles/:id", getUserById);
router.post("/profiles", addUser);
router.put("/profiles/:id", updateUser);
router.delete("/profiles/:id", deleteUser);

router.get("/", getUsers);
router.get("/:id([0-9]+)", getUserById);
router.post("/", addUser);
router.put("/:id([0-9]+)", updateUser);
router.delete("/:id([0-9]+)", deleteUser);

module.exports = router;
