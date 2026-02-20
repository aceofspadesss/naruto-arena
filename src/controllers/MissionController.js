const MissionModel = require('../models/MissionModel');
const MissionCategoryModel = require('../models/MissionCategoryModel');
const CharacterModel = require('../models/CharacterModel');
const fs = require('fs').promises;
const { publicPath } = require('../utils/paths');

const RANKS = ['Academy Student', 'Genin', 'Chuunin', 'Special Jounin', 'Jounin', 'Legendary Sannin', 'Hokage'];

async function getMissionThumbnailIds() {
    try {
        const missionsDir = publicPath('images', 'missions');
        const entries = await fs.readdir(missionsDir, { withFileTypes: true });
        const ids = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const imgPath = `${missionsDir}/${entry.name}/image.jpg`;
                try {
                    await fs.access(imgPath);
                    ids.push(entry.name);
                } catch {}
            }
        }
        return ids.sort((a, b) => parseInt(a) - parseInt(b));
    } catch {
        return [];
    }
}

// Parse goals from form POST body.
// The form sends parallel arrays: goalType[], goalCharacterId[], goalAgainstCharacterId[], goalCount[]
function parseGoals(body) {
    const types = [].concat(body.goalType || []);
    const chars = [].concat(body.goalCharacterId || []);
    const chars2 = [].concat(body.goalCharacter2Id || []);
    const chars3 = [].concat(body.goalCharacter3Id || []);
    const against = [].concat(body.goalAgainstCharacterId || []);
    const counts = [].concat(body.goalCount || []);

    return types.map((type, i) => {
        const goal = { type, characterId: chars[i] || '', count: parseInt(counts[i]) || 1 };
        if (type === 'wins_against_with') {
            goal.againstCharacterId = against[i] || '';
        }
        if (type === 'wins_in_row_with_either') {
            goal.character2Id = chars2[i] || '';
        }
        if (type === 'wins_with_any') {
            goal.character2Id = chars2[i] || '';
            goal.character3Id = chars3[i] || '';
        }
        return goal;
    }).filter(g => g.type);
}

// Parse rewards from form POST body.
function parseRewards(body) {
    const type = body.rewardType || 'text';
    if (type === 'character') {
        return { type: 'character', characterId: body.rewardCharacterId || '' };
    }
    return { type: 'text', value: body.rewardText || '' };
}

const MissionController = {
    list: async (req, res) => {
        const missions = await MissionModel.getAll();
        const categories = await MissionCategoryModel.getAll();
        const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
        const filterCategoryId = req.query.category || null;

        const filtered = filterCategoryId
            ? missions.filter(m => m.categoryId === filterCategoryId)
            : missions;
        filtered.sort((a, b) => {
            if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);
            return a.order - b.order;
        });

        res.render('admin/missions/index', { missions: filtered, categories, categoryMap, filterCategoryId });
    },

    createPage: async (req, res) => {
        const categories = await MissionCategoryModel.getAll();
        const thumbnailIds = await getMissionThumbnailIds();
        const allMissions = await MissionModel.getAll();
        const characters = CharacterModel.findAll().filter(c => !c.locked);
        const selectedCategory = req.query.category || (categories[0] ? categories[0].id : null);
        res.render('admin/missions/create', { categories, thumbnailIds, allMissions, ranks: RANKS, selectedCategory, characters });
    },

    createAction: async (req, res) => {
        const { categoryId, name, slug, difficulty, thumbnailId, rank, order, description } = req.body;
        const missionsCompleted = [].concat(req.body.missionsCompleted || []).filter(Boolean);
        const goals = parseGoals(req.body);
        const rewards = parseRewards(req.body);
        await MissionModel.create(categoryId, name, slug, difficulty, thumbnailId, rank, missionsCompleted, order, description, goals, rewards);
        res.redirect(`/admin/missions?category=${categoryId}`);
    },

    editPage: async (req, res) => {
        const mission = await MissionModel.getById(req.params.id);
        if (!mission) return res.redirect('/admin/missions');
        const categories = await MissionCategoryModel.getAll();
        const thumbnailIds = await getMissionThumbnailIds();
        const allMissions = (await MissionModel.getAll()).filter(m => m.id !== mission.id);
        const characters = CharacterModel.findAll().filter(c => !c.locked);
        res.render('admin/missions/edit', { mission, categories, thumbnailIds, allMissions, ranks: RANKS, characters });
    },

    editAction: async (req, res) => {
        const { name, slug, difficulty, thumbnailId, rank, order, description } = req.body;
        const missionsCompleted = [].concat(req.body.missionsCompleted || []).filter(Boolean);
        const goals = parseGoals(req.body);
        const rewards = parseRewards(req.body);
        const mission = await MissionModel.getById(req.params.id);
        await MissionModel.update(req.params.id, name, slug, difficulty, thumbnailId, rank, missionsCompleted, order, description, goals, rewards);
        res.redirect(`/admin/missions?category=${mission ? mission.categoryId : ''}`);
    },

    deleteAction: async (req, res) => {
        const mission = await MissionModel.getById(req.params.id);
        await MissionModel.delete(req.params.id);
        res.redirect(`/admin/missions?category=${mission ? mission.categoryId : ''}`);
    }
};

module.exports = MissionController;
