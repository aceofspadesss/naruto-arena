const fs = require('fs').promises;
const fsSync = require('fs');
const { dataPath } = require('../utils/paths');

const MISSIONS_FILE = dataPath('missions.json');

const RANK_ORDER = ['Academy Student', 'Genin', 'Chuunin', 'Special Jounin', 'Jounin', 'Legendary Sannin', 'Hokage'];

const MissionModel = {
    async getAll() {
        try {
            const data = await fs.readFile(MISSIONS_FILE, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    },

    getAllSync() {
        try {
            const data = fsSync.readFileSync(MISSIONS_FILE, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    },

    async saveAll(missions) {
        await fs.writeFile(MISSIONS_FILE, JSON.stringify(missions, null, 4));
    },

    async getById(id) {
        const missions = await this.getAll();
        return missions.find(m => m.id === id) || null;
    },

    async getByCategory(categoryId) {
        const missions = await this.getAll();
        return missions
            .filter(m => m.categoryId === categoryId)
            .sort((a, b) => a.order - b.order);
    },

    async getBySlug(slug) {
        const missions = await this.getAll();
        return missions.find(m => m.slug === slug) || null;
    },

    async create(categoryId, name, slug, difficulty, thumbnailId, rank, missionsCompleted, order, description, goals, rewards) {
        const missions = await this.getAll();
        const categoryMissions = missions.filter(m => m.categoryId === categoryId);
        const newMission = {
            id: Date.now().toString(),
            categoryId,
            name,
            slug,
            difficulty,
            thumbnailId,
            description: description || '',
            goals: goals || [],
            rewards: rewards || { type: 'text', value: '' },
            requirements: {
                rank: rank || 'Academy Student',
                missionsCompleted: missionsCompleted || []
            },
            order: parseInt(order) || categoryMissions.length + 1
        };
        missions.push(newMission);
        await this.saveAll(missions);
        return newMission;
    },

    async update(id, name, slug, difficulty, thumbnailId, rank, missionsCompleted, order, description, goals, rewards) {
        const missions = await this.getAll();
        const index = missions.findIndex(m => m.id === id);
        if (index === -1) return null;

        missions[index] = {
            ...missions[index],
            name,
            slug,
            difficulty,
            thumbnailId,
            description: description || '',
            goals: goals || [],
            rewards: rewards || { type: 'text', value: '' },
            requirements: {
                rank: rank || 'Academy Student',
                missionsCompleted: missionsCompleted || []
            },
            order: parseInt(order) || missions[index].order
        };

        await this.saveAll(missions);
        return missions[index];
    },

    async delete(id) {
        let missions = await this.getAll();
        missions = missions.filter(m => m.id !== id);
        await this.saveAll(missions);
    },

    // Returns true if the user meets all requirements for a mission.
    // user may be null (not logged in).
    meetsRequirements(mission, user) {
        if (!user) return { rankMet: false, missionsCompletedMet: {} };

        const userRankIndex = RANK_ORDER.indexOf(user.rank);
        const requiredRankIndex = RANK_ORDER.indexOf(mission.requirements.rank);
        const rankMet = userRankIndex >= requiredRankIndex;

        const completed = user.completedMissions || [];
        const missionsCompletedMet = {};
        for (const reqId of mission.requirements.missionsCompleted) {
            missionsCompletedMet[reqId] = completed.includes(reqId);
        }

        return { rankMet, missionsCompletedMet };
    }
};

module.exports = MissionModel;
