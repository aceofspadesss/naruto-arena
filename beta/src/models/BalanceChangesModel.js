const fs = require('fs').promises;
const path = require('path');

const BALANCE_CHANGES_FILE = path.join(__dirname, '../../data/balance_changes.json');

const BalanceChangesModel = {
    async getContent() {
        try {
            const data = await fs.readFile(BALANCE_CHANGES_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.content || '';
        } catch (error) {
            return '';
        }
    },

    async getData() {
        try {
            const data = await fs.readFile(BALANCE_CHANGES_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { content: '', updatedAt: null };
        }
    },

    async updateContent(content) {
        const data = {
            content,
            updatedAt: new Date().toISOString()
        };
        await fs.writeFile(BALANCE_CHANGES_FILE, JSON.stringify(data, null, 4));
        return data;
    }
};

module.exports = BalanceChangesModel;
