module.exports = function manageOrDemoUserMiddleware(req, res, next) {
  const role = String(req.user?.role || "").trim().toLowerCase();
  if (role === "admin" || role === "manager") {
    return next();
  }

  // Training users assigned to demo DB can perform manager-like CRUD.
  const resolvedDb = String(req.databaseName || "").toLowerCase();
  const tokenDb = String(req.user?.database_name || "").toLowerCase();
  if (role === "user" && (resolvedDb === "demo" || tokenDb === "demo")) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
};
