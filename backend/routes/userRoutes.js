const express = require("express");
const {
  getUsers,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  getProfiles,
  getProfileById,
  addProfile,
  updateProfile,
  deleteProfile,
  getProfileUserByEmail,
  getProfileUserOptions,
  getMyMappedCompanies
} = require("../controllers/userController");
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

const router = express.Router();

router.use(authMiddleware);

router.get("/assignable", roleMiddleware(["admin","manager","user"]), getUsers);
router.get("/profiles/user-options", roleMiddleware(["admin","manager","user"]), getProfileUserOptions);
router.get("/profiles/user-by-email", roleMiddleware(["admin","manager","user"]), getProfileUserByEmail);
router.get("/my-companies", roleMiddleware(["admin","manager","user"]), getMyMappedCompanies);
router.get("/access/me", getMyAccess);
router.get("/inv-map/me", roleMiddleware(["admin","manager","user"]), getMyInvMap);
router.put("/inv-map/me/quotation2-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation2RenderVisibility);
router.put("/inv-map/me/quotation3-render-inputs", roleMiddleware(["admin","manager","user"]), saveMyQuotation3RenderVisibility);
router.post("/", roleMiddleware(["admin","manager","user"]), addUser);

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
router.get("/profiles", getProfiles);
router.get("/profiles/:id", getProfileById);
router.post("/profiles", addProfile);
router.put("/profiles/:id", updateProfile);
router.delete("/profiles/:id", deleteProfile);
router.get("/access/:userId", getUserAccess);
router.put("/access/:userId", saveUserAccess);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
