const fs = require('fs').promises;
const { dataPath } = require('../utils/paths');

const CATEGORIES_FILE = dataPath('mission_categories.json');

const MissionCategoryModel = {
    async getAll() {
        try {
            const data = await fs.readFile(CATEGORIES_FILE, 'utf8');
            const categories = JSON.parse(data);
            return categories.sort((a, b) => a.order - b.order);
        } catch (error) {
            return [];
        }
    },

    async saveAll(categories) {
        await fs.writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 4));
    },

    async getById(id) {
        const categories = await this.getAll();
        return categories.find(c => c.id === id) || null;
    },

    async create(title, slug, description, thumbnailId, order) {
        const categories = await this.getAll();
        const newCategory = {
            id: Date.now().toString(),
            title,
            slug,
            description,
            thumbnailId,
            order: parseInt(order) || categories.length + 1
        };
        categories.push(newCategory);
        await this.saveAll(categories);
        return newCategory;
    },

    async update(id, title, slug, description, thumbnailId, order) {
        const categories = await this.getAll();
        const index = categories.findIndex(c => c.id === id);
        if (index === -1) return null;

        categories[index] = {
            ...categories[index],
            title,
            slug,
            description,
            thumbnailId,
            order: parseInt(order) || categories[index].order
        };

        await this.saveAll(categories);
        return categories[index];
    },

    async delete(id) {
        let categories = await this.getAll();
        categories = categories.filter(c => c.id !== id);
        await this.saveAll(categories);
    }
};

module.exports = MissionCategoryModel;
