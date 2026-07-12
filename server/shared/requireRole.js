function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
    }

    next();
  };
}

module.exports = requireRole;
