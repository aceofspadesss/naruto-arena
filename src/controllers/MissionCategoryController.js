const MissionCategoryModel = require('../models/MissionCategoryModel');
const MissionModel = require('../models/MissionModel');
const UserModel = require('../models/UserModel');
const CharacterModel = require('../models/CharacterModel');
const fs = require('fs').promises;
const { publicPath } = require('../utils/paths');

function charSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function getThumbnailIds() {
    try {
        const contentDir = publicPath('images', 'content');
        const entries = await fs.readdir(contentDir, { withFileTypes: true });
        const ids = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const thumbPath = `${contentDir}/${entry.name}/thumbnail.jpg`;
                try {
                    await fs.access(thumbPath);
                    ids.push(entry.name);
                } catch {
                    // no thumbnail in this dir
                }
            }
        }
        return ids.sort((a, b) => parseInt(a) - parseInt(b));
    } catch {
        return [];
    }
}

async function getRandomImages() {
    const headerDir = publicPath('images', 'randomheader');
    let randomHeaderImage = 'header1.jpg';
    try {
        const files = await fs.readdir(headerDir);
        const images = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
        if (images.length > 0) randomHeaderImage = images[Math.floor(Math.random() * images.length)];
    } catch {}

    const screenshotDir = publicPath('images', 'randomscreenshot');
    let randomScreenshot = 'battle1.jpg';
    try {
        const files = await fs.readdir(screenshotDir);
        const images = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
        if (images.length > 0) randomScreenshot = images[Math.floor(Math.random() * images.length)];
    } catch {}

    return { randomHeaderImage, randomScreenshot };
}

const MissionCategoryController = {
    // Public: category missions page (slug-based)
    categoryPage: async (req, res, next) => {
        const slug = req.params.slug;
        const categories = await MissionCategoryModel.getAll();
        const category = categories.find(c => c.slug === slug);
        if (!category) return next();

        const allMissions = await MissionModel.getAll();
        const missions = allMissions
            .filter(m => m.categoryId === category.id)
            .sort((a, b) => a.order - b.order);

        const user = req.session.userId ? UserModel.findById(req.session.userId) : null;
        const statistics = UserModel.getStatistics();
        const { randomHeaderImage, randomScreenshot } = await getRandomImages();

        // Attach requirement status to each mission
        const missionsWithStatus = missions.map(mission => {
            const { rankMet, missionsCompletedMet } = MissionModel.meetsRequirements(mission, user);
            const allPrereqsMet = mission.requirements.missionsCompleted.length === 0 ||
                Object.values(missionsCompletedMet).every(v => v);
            const allMet = !!user && rankMet && allPrereqsMet;

            const prereqs = mission.requirements.missionsCompleted.map(id => {
                const m = allMissions.find(m => m.id === id);
                return { id, name: m ? m.name : id, met: missionsCompletedMet[id] || false };
            });

            const isCompleted = !!user && (user.completedMissions || []).map(String).includes(String(mission.id));
            return { ...mission, rankMet, prereqs, allMet, isCompleted };
        });

        res.render('category_missions', {
            user: user ? user.username : null,
            role: req.session.role,
            randomHeaderImage,
            randomScreenshot,
            statistics,
            category,
            missions: missionsWithStatus,
            isLoggedIn: !!user
        });
    },

    // Public: individual mission info page
    missionInfoPage: async (req, res, next) => {
        const slug = req.params.slug;
        const mission = await MissionModel.getBySlug(slug);
        if (!mission) return next();

        const categories = await MissionCategoryModel.getAll();
        const category = categories.find(c => c.id === mission.categoryId) || null;

        const user = req.session.userId ? UserModel.findById(req.session.userId) : null;
        const statistics = UserModel.getStatistics();
        const { randomHeaderImage, randomScreenshot } = await getRandomImages();

        // Build character map { id -> { name, slug } }
        const allCharacters = CharacterModel.findAll();
        const charMap = {};
        allCharacters.forEach(c => {
            const nameParts = c.name.split(' ');
            const displayName = nameParts.length > 2 && nameParts[1] === 'of' ? nameParts[0] : nameParts[nameParts.length - 1];
            charMap[String(c.id)] = { name: displayName, slug: charSlug(c.name) };
        });

        // Resolve prerequisite mission names
        const allMissions = await MissionModel.getAll();
        const { rankMet, missionsCompletedMet } = MissionModel.meetsRequirements(mission, user);
        const prereqs = mission.requirements.missionsCompleted.map(id => {
            const m = allMissions.find(m => m.id === id);
            return { id, name: m ? m.name : id, slug: m ? m.slug : null, met: missionsCompletedMet[id] || false };
        });
        const allPrereqsMet = prereqs.length === 0 || prereqs.every(p => p.met);
        const allMet = !!user && rankMet && allPrereqsMet;
        const isCompleted = !!user && (user.completedMissions || []).map(String).includes(String(mission.id));

        // Compute per-goal progress for the logged-in user
        const goalProgress = (mission.goals || []).map((_, idx) => {
            if (!user) return 0;
            return ((user.missionProgress || {})[mission.id] || { goals: [] }).goals[idx]?.count || 0;
        });

        // Resolve reward character if applicable
        let rewardCharacter = null;
        if (mission.rewards && mission.rewards.type === 'character' && mission.rewards.characterId) {
            const rc = charMap[String(mission.rewards.characterId)];
            if (rc) rewardCharacter = rc;
        }

        res.render('mission_info', {
            user: user ? user.username : null,
            role: req.session.role,
            randomHeaderImage,
            randomScreenshot,
            statistics,
            mission,
            category,
            charMap,
            prereqs,
            rankMet: !!user && rankMet,
            allMet,
            isLoggedIn: !!user,
            isCompleted,
            rewardCharacter,
            goalProgress
        });
    },

    // Admin: list categories
    list: async (req, res) => {
        const categories = await MissionCategoryModel.getAll();
        res.render('admin/mission_categories/index', { categories });
    },

    createPage: async (req, res) => {
        const thumbnailIds = await getThumbnailIds();
        res.render('admin/mission_categories/create', { thumbnailIds });
    },

    createAction: async (req, res) => {
        const { title, slug, description, thumbnailId, order } = req.body;
        await MissionCategoryModel.create(title, slug, description, thumbnailId, order);
        res.redirect('/admin/mission-categories');
    },

    editPage: async (req, res) => {
        const category = await MissionCategoryModel.getById(req.params.id);
        if (!category) return res.redirect('/admin/mission-categories');
        const thumbnailIds = await getThumbnailIds();
        res.render('admin/mission_categories/edit', { category, thumbnailIds });
    },

    editAction: async (req, res) => {
        const { title, slug, description, thumbnailId, order } = req.body;
        await MissionCategoryModel.update(req.params.id, title, slug, description, thumbnailId, order);
        res.redirect('/admin/mission-categories');
    },

    deleteAction: async (req, res) => {
        await MissionCategoryModel.delete(req.params.id);
        res.redirect('/admin/mission-categories');
    }
};

module.exports = MissionCategoryController;
