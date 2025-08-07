function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }
        next();
    };
}

module.exports = authorizeRoles;