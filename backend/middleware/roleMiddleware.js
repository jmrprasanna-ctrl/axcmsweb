const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = String(req.user.role || "").toLowerCase();
    const allowed = allowedRoles.map(r => String(r).toLowerCase());
    if (!allowed.includes(role)) {
      const resolvedDb = String(req.databaseName || "").toLowerCase();
      const tokenDb = String(req.user?.database_name || "").toLowerCase();
      const isTrainingDemoUser = role === "user" && (resolvedDb === "demo" || tokenDb === "demo");
      const managerLevelRoute = allowed.includes("manager");
      if (isTrainingDemoUser && managerLevelRoute) {
        return next();
      }
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

module.exports = roleMiddleware;
