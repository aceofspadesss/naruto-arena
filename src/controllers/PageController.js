const PollModel = require('../models/PollModel');
const UserModel = require('../models/UserModel');
const NewsModel = require('../models/NewsModel');
const LadderService = require('../services/LadderService');
const MessageModel = require('../models/MessageModel');
const BalanceChangesModel = require('../models/BalanceChangesModel');
const SearchService = require('../services/SearchService');
const CharacterModel = require('../models/CharacterModel');
const MissionCategoryModel = require('../models/MissionCategoryModel');
const MissionModel = require('../models/MissionModel');
const { publicPath } = require('../utils/paths');
const { VERSION } = require('../config');

const PageController = {
    // ... (existing code)
    search: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const query = req.params.query;
        let searchResults = [];
        let viewName = 'search';

        if (query) {
            viewName = 'search_results';
            // Perform search
            try {
                searchResults = await SearchService.search(query);
            } catch (e) {
                console.error('Error searching:', e);
            }
        }

        res.render(viewName, {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            searchQuery: query,
            searchResults
        });
    },
    login: async (req, res) => {
        // Redirect logged-in users to home page
        if (req.session.userId) {
            return res.redirect('/');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();

        res.render('login', {
            randomHeaderImage,
            statistics,
            loginError: req.query.error || null
        });
    },

    register: async (req, res) => {
        // Redirect logged-in users to home page
        if (req.session.userId) {
            return res.redirect('/');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();

        res.render('register', {
            randomHeaderImage,
            statistics,
            error: req.query.error || null,
            errorMessage: req.query.message || null
        });
    },

    lostPassword: async (req, res) => {
        // Redirect logged-in users to home page
        if (req.session.userId) {
            return res.redirect('/');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();

        res.render('lost_password', {
            randomHeaderImage,
            statistics,
            emailSent: false
        });
    },

    lostPasswordSubmit: async (req, res) => {
        // Redirect logged-in users to home page
        if (req.session.userId) {
            return res.redirect('/');
        }

        const crypto = require('crypto');
        const EmailService = require('../services/EmailService');
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const email = req.body.email?.trim();

        // Always show success message for security (don't reveal if email exists)
        let emailSent = true;

        if (email) {
            // Look up user by email
            const user = UserModel.findByEmail(email);

            if (user) {
                // Generate secure reset token
                const resetToken = crypto.randomBytes(32).toString('hex');
                const tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now

                // Store token in user record
                UserModel.setResetToken(user.id, resetToken, tokenExpiry);

                // Get client IP address
                const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';

                // Send password reset email
                await EmailService.sendPasswordResetEmail(email, user.username, resetToken, ipAddress);
            }
        }

        res.render('lost_password', {
            randomHeaderImage,
            statistics,
            emailSent
        });
    },

    resetPassword: async (req, res) => {
        // Redirect logged-in users to home page
        if (req.session.userId) {
            return res.redirect('/');
        }

        const token = req.params.token;
        const user = UserModel.findByResetToken(token);

        // If token is invalid or expired, redirect to lost password page
        if (!user) {
            return res.redirect('/lost-password?error=invalid_token');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();

        res.render('reset_password', {
            randomHeaderImage,
            statistics,
            passwordReset: false,
            error: null
        });
    },

    resetPasswordSubmit: async (req, res) => {
        // Redirect logged-in users to home page
        if (req.session.userId) {
            return res.redirect('/');
        }

        const token = req.params.token;
        const user = UserModel.findByResetToken(token);

        // If token is invalid or expired, redirect to lost password page
        if (!user) {
            return res.redirect('/lost-password?error=invalid_token');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();

        const { password, password_confirm } = req.body;

        // Validate password
        if (!password || password.length < 3) {
            return res.render('reset_password', {
                randomHeaderImage,
                statistics,
                passwordReset: false,
                error: 'Password must be at least 3 characters long.'
            });
        }

        if (password.length > 16) {
            return res.render('reset_password', {
                randomHeaderImage,
                statistics,
                passwordReset: false,
                error: 'Password cannot be more than 16 characters.'
            });
        }

        if (password !== password_confirm) {
            return res.render('reset_password', {
                randomHeaderImage,
                statistics,
                passwordReset: false,
                error: 'Passwords do not match.'
            });
        }

        // Update the password (stored as plain text to match existing system)
        UserModel.update(user.id, { password: password });

        // Clear the reset token
        UserModel.clearResetToken(user.id);

        res.render('reset_password', {
            randomHeaderImage,
            statistics,
            passwordReset: true
        });
    },

    game: (req, res) => {
        res.render('game');
    },

    gameManual: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('game_manual', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    latestBalanceChanges: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const balanceChangesContent = await BalanceChangesModel.getContent();

        res.render('latest_balance_changes', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            balanceChangesContent
        });
    },

    faq: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('faq', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    news: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const news = await NewsModel.getLatest(5);

        res.render('news', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            news
        });
    },

    contact: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('contact', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },



    memberList: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const page = parseInt(req.query.page) || 1;
        const sortField = req.query.sort || 'username';
        const sortOrder = req.query.order || 'asc';

        const filters = {
            username: req.query.search || '',
            posts: req.query.posts || '',
            rank: req.query.rank || 'all',
            country: req.query.country || 'all',
            onlinestatus: req.query.status || 'all'
        };

        const { members, totalMembers, totalPages, currentPage } = UserModel.getMembers({
            page,
            limit: 20,
            sortField,
            sortOrder,
            filters
        });

        res.render('memberlist', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            members,
            pagination: {
                page: currentPage,
                totalPages,
                totalMembers,
                sortField,
                sortOrder,
                filters
            }
        });
    },

    usersOnline: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';
        const BattleModel = require('../models/BattleModel');

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        // Get all online users (active in last 15 mins)
        const allUsers = UserModel.getUsers();
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;
        const onlineUsers = allUsers.filter(u => u.lastActive && (now - u.lastActive < fifteenMinutes));

        // Group users by location
        const groupedUsers = {};

        onlineUsers.forEach(user => {
            let locationTitle = user.locationTitle || 'Unknown';
            let locationUrl = user.locationUrl || '/';

            // Check if user is in a battle
            if (user.battleId && user.opponentId) {
                const opponent = UserModel.findById(user.opponentId);
                const opponentName = opponent ? opponent.username : 'CPU';
                locationTitle = `Naruto Arena > In Game > ${user.username} vs ${opponentName}`;
                locationUrl = '/'; // In-game link usually goes to home/game
            }

            if (!groupedUsers[locationTitle]) {
                groupedUsers[locationTitle] = {
                    title: locationTitle,
                    url: locationUrl,
                    users: []
                };
            }

            groupedUsers[locationTitle].users.push({
                username: user.username,
                rankImage: user.role === 'admin' ? '/images/layout/mem-admin.gif' :
                    user.role === 'moderator' ? '/images/layout/mem-mod.gif' : null // Regular members don't have icon in this list style? Checking source...
                // In usage: <a href="..." class="con" alt="...">Username</a>
            });
        });

        // Convert to array for easy iteration in view
        const locations = Object.values(groupedUsers);

        res.render('users_online', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            locations,
            totalOnline: onlineUsers.length
        });
    },

    privacyPolicy: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('privacy_policy', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    ninjaMissions: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const missionCategories = await MissionCategoryModel.getAll();

        res.render('ninja_missions', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            missionCategories
        });
    },

    mission: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('mission', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    ladders: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('ladders', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    legalDisclaimer: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('legal_disclaimer', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    termsOfUse: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('terms_of_use', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    theBasics: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('the_basics', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    theNinjaLadder: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('the_ninja_ladder', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    sitemap: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('sitemap', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot
        });
    },

    pollArchive: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const polls = await PollModel.getAll();

        // Sort polls by date (newest first)
        polls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Group polls by Month and Year
        const groupedPolls = {};
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        polls.forEach(poll => {
            const date = new Date(poll.createdAt);
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const key = `${month} ${year}`;

            if (!groupedPolls[key]) {
                groupedPolls[key] = [];
            }

            // Add formatted date for display
            // Format: mm-dd-yyyy (matches the "op 07-03-2006" format in the mockup, though usually we want dd-mm-yyyy or similar? 
            // The mockup says "07-03-2006" for July, likely mm-dd-yyyy or dd-mm-yyyy. 
            // Standard US is mm-dd-yyyy. Let's use mm-dd-yyyy to be safe or dd-mm-yyyy if European.
            // Given the month name in header, let's just stick to a consistent format.
            // Let's use mm-dd-yyyy based on the example 07-03-2006 for July 3rd (or March 7th?).
            // Let's formatting as mm-dd-yyyy.
            const day = String(date.getDate()).padStart(2, '0');
            const mo = String(date.getMonth() + 1).padStart(2, '0');
            poll.formattedDate = `${mo}-${day}-${date.getFullYear()}`;

            // Allow slug based on question if not present (PollModel logic handles lookup by question slug)
            poll.slug = poll.question.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            groupedPolls[key].push(poll);
        });

        res.render('pollarchive', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            groupedPolls
        });
    },

    ninjaLadder: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        // Get ranked users
        const rankedUsers = LadderService.getRankedUsers();

        // Pagination logic
        const currentPage = parseInt(req.params.page) || 1;
        // Show 100 users per page for v2, 25 for others (v1)
        const usersPerPage = VERSION === 'v2' ? 100 : 25;
        const totalRanked = rankedUsers.length;
        const totalPages = Math.ceil(totalRanked / usersPerPage);

        // Validate current page
        const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

        const startIndex = (safeCurrentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const displayedUsers = rankedUsers.slice(startIndex, endIndex);

        // Add ninja rank info to displayed users
        const usersWithRanks = displayedUsers.map(user => ({
            ...user,
            ninjaRank: LadderService.getNinjaRank(user.ladderPosition, totalRanked)
        }));

        res.render('ninja_ladder', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            rankedUsers: usersWithRanks,
            currentPage: safeCurrentPage,
            totalPages,
            totalRanked
        });
    },

    countryLadder: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const countryLadder = LadderService.getCountryLadder();

        res.render('country_ladder', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            countryLadder
        });
    },

    newsArchive: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        // Fetch all news
        let allNews = await NewsModel.getAll();

        // Sort by date descending
        allNews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Process news items (add author name, slug, formatted date)
        const processedNews = allNews.map(item => {
            const user = UserModel.findById(item.author);
            const date = new Date(item.createdAt);

            // Format date: Monday, July 3, 2006 at 04:40
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
            // Custom formatting to match "Monday, July 3, 2006 at 04:40"
            // The default toLocaleString might obey locale, let's try to construct it manually or use options if close enough.
            // Using a custom formatter for precise control
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            const dayName = days[date.getDay()];
            const monthName = months[date.getMonth()];
            const dayOfMonth = date.getDate();
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            const formattedDate = `${dayName}, ${monthName} ${dayOfMonth}, ${year} at ${hours}:${minutes}`;

            // Group Key: Month Year (e.g., July 2006)
            const groupKey = `${monthName} ${year}`;

            return {
                ...item,
                authorName: user ? user.username : 'Unknown',
                slug: item.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                formattedDate,
                groupKey
            };
        });

        // Group by Month Year
        const groupedNews = {};
        processedNews.forEach(item => {
            if (!groupedNews[item.groupKey]) {
                groupedNews[item.groupKey] = [];
            }
            groupedNews[item.groupKey].push(item);
        });

        res.render('news_archive', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            groupedNews
        });
    },

    charactersAndSkills: async (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        // Load characters
        let characters = CharacterModel.findAll();

        res.render('characters_and_skills', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            characters
        });
    },

    characterInfo: async (req, res, next) => {
        const fs = require('fs');
        const path = require('path');
        const slug = req.params.slug;

        // Load characters
        let character = null;
        try {
            const characters = CharacterModel.findAll();

            // Find character by slug (convert name to slug and compare)
            character = characters.find(c => {
                const charSlug = c.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                return charSlug === slug;
            });
        } catch (error) {
            console.error('Error getting character info:', error);
        }

        if (!character) {
            // Not a character slug, pass to next route handler
            return next();
        }

        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const CommentModel = require('../models/CommentModel');
        const page = parseInt(req.params.page) || 1;
        const limit = 15;
        const totalComments = CommentModel.countByNewsSlug(slug);
        const totalPages = Math.ceil(totalComments / limit);
        const comments = CommentModel.getByNewsSlug(slug, page, limit);

        // Get avatar and post count for each comment author
        const commentsWithUserData = comments.map(comment => {
            const user = UserModel.findById(comment.userId);
            return {
                ...comment,
                authorAvatar: user ? (user.avatar || 'default.jpg') : 'default.jpg',
                authorPosts: user ? (user.posts || 0) : 0,
                authorRank: user ? (user.rank || 'Academy Student') : 'Academy Student'
            };
        });

        const allMissions = await MissionModel.getAll();
        const unlockMission = allMissions.find(m =>
            m.rewards && m.rewards.type === 'character' && String(m.rewards.characterId) === String(character.id)
        ) || null;

        res.render('character_info', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            character,
            comments: commentsWithUserData,
            currentPage: page,
            totalPages: totalPages,
            totalComments: totalComments,
            unlockMission
        });
    },

    adminCharacters: (req, res) => {
        res.render('admin_characters');
    },

    profile: async (req, res) => {
        const username = req.params.username;
        const profileUser = UserModel.findByUsername(username);
        const statistics = UserModel.getStatistics();

        if (!profileUser) {
            return res.status(404).send('User not found');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            return res.status(404).render('404', {
                user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
                role: req.session.role,
                randomHeaderImage,
                statistics
            });
        }

        // Determine Last Page Activity
        let locationTitle = profileUser.locationTitle || 'Unknown';
        let locationUrl = profileUser.locationUrl || '/';

        if (profileUser.battleId && profileUser.opponentId) {
            const opponent = UserModel.findById(profileUser.opponentId);
            const opponentName = opponent ? opponent.username : 'CPU';
            locationTitle = `Naruto Arena > In Game > ${profileUser.username} vs ${opponentName}`;
            locationUrl = '/';
        }

        // Check if user has a custom avatar or uses a default one
        // Logic: if avatar field is set, use it. If not, check if /images/avatars/ID.jpg exists? 
        // Actually UserModel doesn't seem to have a method to check file existence easily without async
        // For now, let's rely on the view's onerror handler or simple logic if avatar property exists

        // Check for player card
        const playerCardPath = publicPath('images', 'myplayercard', `${profileUser.id}.jpg`);
        const hasPlayerCard = fs.existsSync(playerCardPath);

        res.render('profile', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            profileUser,
            hasPlayerCard,
            locationTitle,
            locationUrl
        });
    },

    changeSettings: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('change_settings', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            currentUser: user,
            error: req.query.error || null,
            errorMessage: req.query.message || null,
            success: req.query.success || null
        });
    },

    changeSettingsSubmit: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const { email, emailhide, discord, youtube, country } = req.body;

        // Validate email (required field)
        if (!email || !email.trim() || !email.includes('@')) {
            return res.redirect('/change-settings?error=email&message=Please enter a valid email address');
        }

        // Update user data
        UserModel.update(user.id, {
            email: email.trim(),
            emailHidden: emailhide === '1',
            discord: discord?.trim() || '',
            youtube: youtube?.trim() || '',
            country: country || ''
        });

        res.redirect('/change-settings?success=Settings updated successfully');
    },

    changePassword: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('change_password', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            error: req.query.error || null,
            success: req.query.success || null
        });
    },

    changePasswordSubmit: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const { current_password, password, password_confirm } = req.body;

        // Verify current password
        if (current_password !== user.password) {
            return res.redirect('/change-password?error=Current password is incorrect');
        }

        // Validate new password
        if (!password || password.length < 3) {
            return res.redirect('/change-password?error=Password must be at least 3 characters long');
        }

        if (password.length > 16) {
            return res.redirect('/change-password?error=Password cannot be more than 16 characters');
        }

        if (password !== password_confirm) {
            return res.redirect('/change-password?error=Passwords do not match');
        }

        // Update password
        UserModel.update(user.id, { password: password });

        res.redirect('/change-password?success=Password changed successfully');
    },

    resetAccount: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        res.render('reset_account', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            error: req.query.error || null,
            success: req.query.success || null
        });
    },

    resetAccountSubmit: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        // Reset player statistics to default values
        UserModel.update(user.id, {
            wins: 0,
            losses: 0,
            streak: 0,
            level: 1,
            ladderPosition: null,
            rank: 'Academy Student'
        });

        res.redirect('/reset-account?success=Account has been reset successfully');
    },

    changeAvatar: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        // Get preset avatars
        const presetDir = publicPath('images', 'avatars', 'preset');
        let allAvatars = [];

        try {
            const files = await fs.promises.readdir(presetDir);
            allAvatars = files.filter(file =>
                /\.(jpg|jpeg)$/i.test(file) && file.toLowerCase() !== 'default.jpg'
            ).sort();
        } catch (error) {
            console.error('Error reading preset avatars:', error);
        }

        // Pagination
        const avatarsPerPage = 15;
        const totalPages = Math.ceil(allAvatars.length / avatarsPerPage);
        const currentPage = Math.min(Math.max(1, parseInt(req.query.page) || 1), totalPages);
        const startIndex = (currentPage - 1) * avatarsPerPage;
        const presetAvatars = allAvatars.slice(startIndex, startIndex + avatarsPerPage);

        // Get current avatar
        const userAvatarPath = publicPath('images', 'avatars', `${user.id}.jpg`);
        let currentAvatar = user.avatar || '/images/avatars/default.jpg';

        // Check if user has a custom avatar
        try {
            await fs.promises.access(userAvatarPath);
            currentAvatar = `/images/avatars/${user.id}.jpg`;
        } catch (e) {
            // No custom avatar, use stored or default
        }

        res.render('change_avatar', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            presetAvatars,
            currentPage,
            totalPages,
            currentAvatar,
            error: req.query.error || null,
            success: req.query.success || null
        });
    },

    changeAvatarPreset: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const { preset_avatar } = req.body;

        if (!preset_avatar) {
            return res.redirect('/change-avatar?error=Please select an avatar');
        }

        const fs = require('fs');
        const path = require('path');

        // Verify the preset avatar exists
        const presetPath = publicPath('images', 'avatars', 'preset', preset_avatar);
        try {
            await fs.promises.access(presetPath);
        } catch (e) {
            return res.redirect('/change-avatar?error=Invalid avatar selection');
        }

        // Delete any existing custom avatar
        const customAvatarPath = publicPath('images', 'avatars', `${user.id}.jpg`);
        try {
            await fs.promises.unlink(customAvatarPath);
        } catch (e) {
            // No custom avatar to delete
        }

        // Update user's avatar path
        UserModel.update(user.id, { avatar: `/images/avatars/preset/${preset_avatar}` });

        res.redirect('/change-avatar?success=Avatar updated successfully');
    },

    changeAvatarUpload: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const sharp = require('sharp');

        if (!req.file) {
            return res.redirect('/change-avatar?error=Please select a file to upload');
        }

        const tempPath = req.file.path;
        const targetPath = publicPath('images', 'avatars', `${user.id}.jpg`);

        try {
            // Validate image dimensions (must be 75x75)
            const metadata = await sharp(tempPath).metadata();

            if (metadata.width !== 75 || metadata.height !== 75) {
                await fs.promises.unlink(tempPath);
                return res.redirect('/change-avatar?error=Avatar must be exactly 75x75 pixels');
            }

            // Move temp file to final location
            await fs.promises.rename(tempPath, targetPath);

            // Update user's avatar path
            UserModel.update(user.id, { avatar: `/images/avatars/${user.id}.jpg` });

            res.redirect('/change-avatar?success=Avatar uploaded successfully');
        } catch (error) {
            console.error('Error processing avatar:', error);
            // Clean up temp file
            try {
                await fs.promises.unlink(tempPath);
            } catch (e) { }
            res.redirect('/change-avatar?error=Error processing avatar. Please try again.');
        }
    },

    controlPanel: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        // Random screenshot selection
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }
        // Get unread messages count
        const inbox = MessageModel.getInbox(req.session.userId);
        const unreadMessagesCount = inbox.filter(msg => !msg.isRead).length;

        // Get online buddies count
        const buddies = UserModel.getBuddies(req.session.userId);
        const onlineBuddiesCount = buddies.filter(b => b.isOnline).length;

        res.render('control_panel', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            unreadMessagesCount,
            onlineBuddiesCount
        });
    },

    buddyList: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const buddies = UserModel.getBuddies(req.session.userId);

        res.render('buddy_list', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            buddies,
            error: req.query.error,
            message: req.query.message
        });
    },

    addBuddy: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const { username } = req.body;
        const result = UserModel.addBuddy(req.session.userId, username);

        if (result.success) {
            res.redirect('/buddy-list?message=' + encodeURIComponent(result.message));
        } else {
            res.redirect('/buddy-list?error=' + encodeURIComponent(result.message));
        }
    },

    deleteBuddy: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const { id } = req.body;

        UserModel.removeBuddy(req.session.userId, id);
        res.redirect('/buddy-list');
    },

    privateMessages: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const view = req.query.view || 'inbox';
        let messages = [];

        if (view === 'inbox') {
            messages = MessageModel.getInbox(req.session.userId);
        } else if (view === 'outbox') {
            messages = MessageModel.getOutbox(req.session.userId);
        } else if (view === 'read') {
            const messageId = req.query.id;
            // Find message from all messages for now (or optimize model)
            const allMessages = MessageModel.getMessages();
            const msg = allMessages.find(m => String(m.id) === String(messageId));

            if (msg) {
                // Check if user is sender or receiver
                const isReceiver = String(msg.receiverId) === String(req.session.userId);
                const isSender = String(msg.senderId) === String(req.session.userId);

                if (isReceiver || isSender) {
                    // Mark as read if receiver
                    if (isReceiver && !msg.isRead) {
                        MessageModel.markAsRead(msg.id, req.session.userId);
                    }

                    // Format message for view
                    const sender = UserModel.findById(msg.senderId);
                    const receiver = UserModel.findById(msg.receiverId);

                    messages = [{
                        ...msg,
                        senderName: sender ? sender.username : 'Unknown',
                        receiverName: receiver ? receiver.username : 'Unknown',
                        rawTimestamp: msg.timestamp
                    }];
                }
            }
        }

        res.render('private_messages', {
            user: user.username,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            messages,
            view,
            queries: req.query,
            error: req.query.error,
            message: req.query.message
        });
    },

    sendPrivateMessage: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const { receiver, subject, content } = req.body;

        const result = MessageModel.create(req.session.userId, receiver, subject, content);

        if (result.success) {
            res.redirect('/private-messages?view=outbox&message=' + encodeURIComponent(result.message));
        } else {
            res.redirect('/private-messages?view=compose&error=' + encodeURIComponent(result.message));
        }
    },

    deletePrivateMessage: async (req, res) => {
        if (!req.session.userId) return res.redirect('/login');
        const { id } = req.body;

        MessageModel.delete(id, req.session.userId);
        const referer = req.get('Referrer') || '/private-messages';
        res.redirect(referer);
    },

    index: async (req, res) => {
        const userId = req.session.userId;

        let role = req.session.role;
        let username = req.session.userId; // Default to ID if not found

        // If logged in, fetch user to get role and username
        if (userId) {
            const user = UserModel.findById(userId);
            if (user) {
                role = user.role;
                username = user.username;
                req.session.role = role; // Update session
            }
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg'; // default

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        // Random screenshot selection
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg'; // default

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        const statistics = UserModel.getStatistics();
        const ladderTop10 = LadderService.getTopPlayers(10);
        const topWins = LadderService.getTopByWins(10);
        const topStreak = LadderService.getTopByStreak(10);

        res.render('index', {
            user: username,
            role: role,
            statistics,
            randomHeaderImage,
            randomScreenshot,
            ladderTop10,
            topWins,
            topStreak,
            loginError: req.query.loginError || null,
            sidebarLoginError: req.query.loginError || null
        });
    },

    myPlayerCard: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const fs = require('fs');
        const path = require('path');
        const headerDir = publicPath('images', 'randomheader');
        let randomHeaderImage = 'header1.jpg';

        try {
            const files = await fs.promises.readdir(headerDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomHeaderImage = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random header images:', error);
        }

        const statistics = UserModel.getStatistics();
        const screenshotDir = publicPath('images', 'randomscreenshot');
        let randomScreenshot = 'battle1.jpg';

        try {
            const files = await fs.promises.readdir(screenshotDir);
            const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            if (images.length > 0) {
                randomScreenshot = images[Math.floor(Math.random() * images.length)];
            }
        } catch (error) {
            console.error('Error reading random screenshot images:', error);
        }

        // Check if player card exists
        const playerCardPath = publicPath('images', 'myplayercard', `${user.id}.jpg`);
        const hasPlayerCard = fs.existsSync(playerCardPath);

        res.render('my_player_card', {
            user: user.username,
            userId: user.id,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            showCharacters: user.showCharacters || false,
            hasPlayerCard,
            success: req.query.success || null,
            error: req.query.error || null
        });
    },

    updatePlayerCard: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user) {
            return res.redirect('/login');
        }

        const PlayerCardService = require('../services/PlayerCardService');
        const showCharacters = req.body.show_characters === 'on' || req.body.show_characters === '1';

        try {
            // Update user preference
            UserModel.update(user.id, { showCharacters: showCharacters });

            // Re-fetch user with updated data
            const updatedUser = UserModel.findById(user.id);

            // Generate the player card
            await PlayerCardService.generatePlayerCard(updatedUser, showCharacters);

            res.redirect('/my-player-card?success=Player card updated successfully');
        } catch (error) {
            console.error('Error generating player card:', error);
            res.redirect('/my-player-card?error=Failed to generate player card');
        }
    }
};

module.exports = PageController;
