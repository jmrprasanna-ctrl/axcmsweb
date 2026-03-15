const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = String(req.user.role || "").toLowerCase();
    const allowed = allowedRoles.map(r => String(r).toLowerCase());
    if (!allowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

module.exports = roleMiddleware;
