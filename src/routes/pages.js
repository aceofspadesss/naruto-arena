const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const PageController = require('../controllers/PageController');
const PollController = require('../controllers/PollController');
const UserController = require('../controllers/UserController');
const NewsController = require('../controllers/NewsController');

const BalanceChangesController = require('../controllers/BalanceChangesController');
const CharacterController = require('../controllers/CharacterController');
const MissionCategoryController = require('../controllers/MissionCategoryController');
const MissionController = require('../controllers/MissionController');

const checkRole = require('../middleware/checkRole');
const UserModel = require('../models/UserModel');
const MessageModel = require('../models/MessageModel');
const { publicPath } = require('../utils/paths');

// Multer configuration for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, publicPath('images', 'avatars'));
    },
    filename: (req, file, cb) => {
        // Will be renamed after validation in controller
        cb(null, `temp_${Date.now()}.jpg`);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 100 * 1024 // 100KB limit
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg') {
            return cb(new Error('Only .jpg files are allowed'), false);
        }
        cb(null, true);
    }
});

// Middleware to populate sidebar counts
router.use((req, res, next) => {
    res.locals.unreadMessagesCount = 0;
    res.locals.onlineBuddiesCount = 0;

    if (req.session && req.session.userId) {
        const userId = req.session.userId;

        // Get Unread Messages Count
        // We could optimize this by adding a specific method in model, but for now reusing getInbox is fine since it works with in-memory array from FS
        const inbox = MessageModel.getInbox(userId);
        res.locals.unreadMessagesCount = inbox.filter(msg => !msg.isRead).length;

        // Get Online Buddies Count
        const buddies = UserModel.getBuddies(userId);
        res.locals.onlineBuddiesCount = buddies.filter(b => b.isOnline).length;

        // Update Location
        // Mapping of paths to readable titles
        let locationTitle = 'Unknown';
        const path = req.path.replace(/\/$/, '') || '/'; // Strip trailing slash, default to / if empty

        if (path === '/') locationTitle = 'Naruto Arena > Main';
        else if (path.startsWith('/profile/')) locationTitle = `Naruto Arena > Main > Profile > ${req.params.username || path.split('/')[2]}`;
        else if (path === '/control-panel') locationTitle = 'Naruto Arena > Control Panel';
        else if (path === '/change-settings') locationTitle = 'Naruto Arena > Control Panel > Change Settings';
        else if (path === '/change-password') locationTitle = 'Naruto Arena > Control Panel > Change Password';
        else if (path === '/change-avatar') locationTitle = 'Naruto Arena > Control Panel > Change Avatar';
        else if (path === '/buddy-list') locationTitle = 'Naruto Arena > Control Panel > Buddy List';
        else if (path === '/my-player-card') locationTitle = 'Naruto Arena > Control Panel > My Player Card';
        else if (path.startsWith('/private-messages')) {
            if (path.includes('/send')) locationTitle = 'Naruto Arena > Control Panel > Private Messages > Send';
            else locationTitle = 'Naruto Arena > Control Panel > Private Messages > Inbox';
        }
        else if (path === '/game') locationTitle = 'Naruto Arena > In Game';
        else if (path === '/game-manual') locationTitle = 'Naruto Arena > Game Manual';
        else if (path === '/latest-balance-changes') locationTitle = 'Naruto Arena > Main > Latest Balance Changes';
        else if (path === '/faq') locationTitle = 'Naruto Arena > Game Manual > FAQ';
        else if (path === '/the-basics') locationTitle = 'Naruto Arena > Game Manual > The Basics';
        else if (path === '/contact') locationTitle = 'Naruto Arena > Main > Contact';
        else if (path === '/memberlist') locationTitle = 'Naruto Arena > Main > Memberlist';
        else if (path === '/privacy-policy') locationTitle = 'Naruto Arena > Main > Privacy Policy';
        else if (path === '/legal-disclaimer') locationTitle = 'Naruto Arena > Main > Legal Disclaimer';
        else if (path === '/terms-of-use') locationTitle = 'Naruto Arena > Main > Terms Of Use';
        else if (path === '/the-ninja-ladder') locationTitle = 'Naruto Arena > Ninja Ladder';
        else if (path.startsWith('/ninja-ladder')) locationTitle = 'Naruto Arena > Ninja Ladder';
        else if (path === '/news-archive') locationTitle = 'Naruto Arena > Main > News Archive';
        else if (path === '/characters-and-skills') locationTitle = 'Naruto Arena > Game Manual > Characters & Skills';
        else if (path === '/users-online') locationTitle = 'Naruto Arena > Main > Users Online';
        // Dynamic routes (like news, polls, characters) - handled simplified for now or rely on specific controllers updating status if needed
        // For simple path matching:
        else {
            // Try to infer from path
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) {
                locationTitle = `Naruto Arena > ${parts.map(p => {
                    // Replace dashes with spaces and capitalize
                    return p.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }).join(' > ')}`;
            }
        }

        if (req.path.includes('/game/engine') || req.path.includes('engine.php')) {
            // Internal request - keep user online but don't change location
            UserModel.updateLastActive(userId);
        } else {
            UserModel.updateLocation(userId, locationTitle, req.originalUrl);
        }
    }
    next();
});

router.get('/', PageController.index);
router.get('/profile/:username', PageController.profile);
router.get('/control-panel', PageController.controlPanel);
router.get('/change-settings', PageController.changeSettings);
router.post('/change-settings', PageController.changeSettingsSubmit);
router.get('/change-password', PageController.changePassword);
router.post('/change-password', PageController.changePasswordSubmit);
router.get('/reset-account', PageController.resetAccount);
router.post('/reset-account', PageController.resetAccountSubmit);
router.get('/change-avatar', PageController.changeAvatar);
router.post('/change-avatar/preset', PageController.changeAvatarPreset);
router.post('/change-avatar/upload', avatarUpload.single('avatar'), PageController.changeAvatarUpload);
router.get('/buddy-list', PageController.buddyList);
router.post('/buddy-list/add', PageController.addBuddy);
router.post('/buddy-list/delete', PageController.deleteBuddy);
router.get('/my-player-card', PageController.myPlayerCard);
router.post('/my-player-card/update', PageController.updatePlayerCard);
router.get('/private-messages', PageController.privateMessages);
router.post('/private-messages/send', PageController.sendPrivateMessage);
router.post('/private-messages/delete', PageController.deletePrivateMessage);
router.get('/login', PageController.login);
router.get('/register', PageController.register);
router.get('/lost-password', PageController.lostPassword);
router.post('/lost-password', PageController.lostPasswordSubmit);
router.get('/lost-password/:token', PageController.resetPassword);
router.post('/lost-password/:token', PageController.resetPasswordSubmit);
router.get('/game', PageController.game);
router.get('/game-manual', PageController.gameManual);
router.get('/latest-balance-changes', PageController.latestBalanceChanges);
router.get('/faq', PageController.faq);
router.get('/the-basics', PageController.theBasics);
router.get('/contact', PageController.contact);
router.get('/search/:query', PageController.search);
router.get('/memberlist', PageController.memberList);
router.get('/ninja-missions', PageController.ninjaMissions); // Existing
router.get('/mission', PageController.mission);
router.get('/mission/:slug', MissionCategoryController.missionInfoPage);
router.get('/ladders', PageController.ladders);
router.get('/privacy-policy', PageController.privacyPolicy);
router.get('/legal-disclaimer', PageController.legalDisclaimer);
router.get('/terms-of-use', PageController.termsOfUse);
router.get('/sitemap', PageController.sitemap);
router.get('/the-ninja-ladder', PageController.theNinjaLadder);
router.get('/ninja-ladder', PageController.ninjaLadder);
router.get('/ninja-ladder/:page', PageController.ninjaLadder);
router.get('/country-ladder', PageController.countryLadder);
router.get('/news-archive', PageController.newsArchive);
router.get('/news', PageController.news);
router.get('/pollarchive', PageController.pollArchive);
router.get('/characters-and-skills', PageController.charactersAndSkills);
router.get('/users-online', PageController.usersOnline);

// Mission category pages (slug-based, before generic /:slug catch-alls)
router.get('/:slug', MissionCategoryController.categoryPage);

// Dynamic character info page (must be before admin routes but after specific routes)
router.get('/:slug/:page', NewsController.newsPage);
router.get('/:slug/:page', PollController.pollPage);
router.get('/:slug/:page', PageController.characterInfo); // Added pagination support
router.get('/:slug', PageController.characterInfo);
router.get('/:slug', PollController.pollPage);
router.get('/:slug', NewsController.newsPage);
router.post('/news/:slug/comment', NewsController.postComment);
router.post('/character/:slug/comment', CharacterController.postComment);
router.post('/poll/:slug/comment', PollController.postComment);

router.get('/admin/characters', checkRole('admin'), PageController.adminCharacters);

// Admin Poll Routes
router.get('/admin/polls', checkRole(['admin', 'moderator']), PollController.list);
router.get('/admin/polls/create', checkRole(['admin', 'moderator']), PollController.createPage);
router.post('/admin/polls/create', checkRole(['admin', 'moderator']), PollController.createAction);
router.get('/admin/polls/edit/:id', checkRole(['admin', 'moderator']), PollController.editPage);
router.post('/admin/polls/edit/:id', checkRole(['admin', 'moderator']), PollController.editAction);
router.post('/admin/polls/delete/:id', checkRole(['admin', 'moderator']), PollController.deleteAction);

// Admin User Routes
router.get('/admin/users', checkRole('admin'), UserController.list);
router.get('/admin/users/create', checkRole('admin'), UserController.createPage);
router.post('/admin/users/create', checkRole('admin'), UserController.createAction);
router.get('/admin/users/edit/:id', checkRole('admin'), UserController.editPage);
router.post('/admin/users/edit/:id', checkRole('admin'), UserController.editAction);
router.post('/admin/users/delete/:id', checkRole('admin'), UserController.deleteAction);

// Public Poll Routes
router.post('/poll/vote/:id', PollController.voteAction);

// Admin News Routes
router.get('/admin/news', checkRole(['admin', 'moderator']), NewsController.list);
router.get('/admin/news/create', checkRole(['admin', 'moderator']), NewsController.createPage);
router.post('/admin/news/create', checkRole(['admin', 'moderator']), NewsController.createAction);
router.get('/admin/news/edit/:id', checkRole(['admin', 'moderator']), NewsController.editPage);
router.post('/admin/news/edit/:id', checkRole(['admin', 'moderator']), NewsController.editAction);
router.post('/admin/news/delete/:id', checkRole(['admin', 'moderator']), NewsController.deleteAction);

// Admin Balance Changes Routes
router.get('/admin/balance-changes', checkRole(['admin', 'moderator']), BalanceChangesController.editPage);
router.post('/admin/balance-changes', checkRole(['admin', 'moderator']), BalanceChangesController.editAction);

// Admin Mission Category Routes
router.get('/admin/mission-categories', checkRole(['admin', 'moderator']), MissionCategoryController.list);
router.get('/admin/mission-categories/create', checkRole(['admin', 'moderator']), MissionCategoryController.createPage);
router.post('/admin/mission-categories/create', checkRole(['admin', 'moderator']), MissionCategoryController.createAction);
router.get('/admin/mission-categories/edit/:id', checkRole(['admin', 'moderator']), MissionCategoryController.editPage);
router.post('/admin/mission-categories/edit/:id', checkRole(['admin', 'moderator']), MissionCategoryController.editAction);
router.post('/admin/mission-categories/delete/:id', checkRole(['admin', 'moderator']), MissionCategoryController.deleteAction);

// Admin Mission Routes
router.get('/admin/missions', checkRole(['admin', 'moderator']), MissionController.list);
router.get('/admin/missions/create', checkRole(['admin', 'moderator']), MissionController.createPage);
router.post('/admin/missions/create', checkRole(['admin', 'moderator']), MissionController.createAction);
router.get('/admin/missions/edit/:id', checkRole(['admin', 'moderator']), MissionController.editPage);
router.post('/admin/missions/edit/:id', checkRole(['admin', 'moderator']), MissionController.editAction);
router.post('/admin/missions/delete/:id', checkRole(['admin', 'moderator']), MissionController.deleteAction);

module.exports = router;
