const BalanceChangesModel = require('../models/BalanceChangesModel');

const BalanceChangesController = {
    // Admin: Show edit form
    editPage: async (req, res) => {
        const data = await BalanceChangesModel.getData();
        console.log('Balance changes data:', data);
        res.render('admin/balance_changes/edit', {
            content: data.content || '',
            updatedAt: data.updatedAt,
            success: req.query.success || null
        });
    },

    // Admin: Handle edit submission
    editAction: async (req, res) => {
        const { content } = req.body;
        await BalanceChangesModel.updateContent(content);
        res.redirect('/admin/balance-changes?success=Content updated successfully');
    }
};

module.exports = BalanceChangesController;
