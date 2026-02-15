const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const userRole = req.session.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (allowedRoles.includes(userRole)) {
            next();
        } else {
            console.log(`Access denied for user ${req.session.userId} with role ${userRole} to ${req.originalUrl}`);
            res.redirect('/');
        }
    };
};

module.exports = checkRole;
