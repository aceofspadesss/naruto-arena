const UserModel = require('../models/UserModel');

const UserController = {
    // List all users
    list: (req, res) => {
        const users = UserModel.findAll();
        res.render('admin/users/index', { users });
    },

    // Show create form
    createPage: (req, res) => {
        res.render('admin/users/create');
    },

    // Handle creation
    createAction: (req, res) => {
        const { username, password, role } = req.body;

        if (UserModel.findByUsername(username)) {
            // Simple error handling for now
            return res.send('User already exists. <a href="/admin/users/create">Try again</a>');
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            password,
            role,
            characters: [],
            wins: 0,
            losses: 0,
            streak: 0,                  // Current win/loss streak
            rank: "Academy Student",  // Unranked until first win
            ladderPosition: null,     // null = unranked
            level: 1
        };

        UserModel.create(newUser);
        res.redirect('/admin/users');
    },

    // Show edit form
    editPage: (req, res) => {
        const user = UserModel.findById(req.params.id); // ID is string in JSON
        if (!user) return res.redirect('/admin/users');
        res.render('admin/users/edit', { user });
    },

    // Handle update
    editAction: (req, res) => {
        const { username, password, role } = req.body;
        // In a real app we would validate unique username if changed, etc.

        UserModel.update(req.params.id, {
            username,
            password,
            role
        });

        res.redirect('/admin/users');
    },

    // Handle delete
    deleteAction: (req, res) => {
        // Prevent deleting yourself? Optional but good practice.
        if (req.params.id === req.session.userId) {
            return res.send('Cannot delete yourself. <a href="/admin/users">Back</a>');
        }

        UserModel.delete(req.params.id);
        res.redirect('/admin/users');
    }
};

module.exports = UserController;
