const UserModel = require('../models/UserModel');

const activeUser = (req, res, next) => {
    if (req.session && req.session.userId) {
        UserModel.updateLastActive(req.session.userId);
    }
    next();
};

module.exports = activeUser;
