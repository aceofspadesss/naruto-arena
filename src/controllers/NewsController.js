const NewsModel = require('../models/NewsModel');
const CommentModel = require('../models/CommentModel');
const { publicPath } = require('../utils/paths');

const NewsController = {
    // Admin: List all news
    list: async (req, res) => {
        const news = await NewsModel.getAll();
        // Sort newest first for admin view
        news.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.render('admin/news/index', { news });
    },

    // Admin: Show create form
    createPage: (req, res) => {
        res.render('admin/news/create');
    },

    // Admin: Handle create submission
    createAction: async (req, res) => {
        const { title, content } = req.body;
        const author = req.session.userId || 'admin';
        await NewsModel.create(title, content, author);
        res.redirect('/admin/news');
    },

    // Admin: Show edit form
    editPage: async (req, res) => {
        const post = await NewsModel.getById(req.params.id);
        if (!post) {
            return res.redirect('/admin/news');
        }
        res.render('admin/news/edit', { post });
    },

    // Admin: Handle edit submission
    editAction: async (req, res) => {
        const { title, content } = req.body;
        await NewsModel.update(req.params.id, title, content);
        res.redirect('/admin/news');
    },

    // Admin: Handle delete
    deleteAction: async (req, res) => {
        await NewsModel.delete(req.params.id);
        res.redirect('/admin/news');
    },

    // Public: News Page

    newsPage: async (req, res, next) => {
        const slug = req.params.slug;
        const newsItem = await NewsModel.getBySlug(slug);

        if (!newsItem) {
            return next();
        }

        const UserModel = require('../models/UserModel');
        // Resolve author name
        const authorUser = UserModel.findById(newsItem.author);
        newsItem.authorName = authorUser ? authorUser.username : 'Unknown';

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

        // Fetch comments
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
                authorAvatar: user ? (user.avatar || '/images/avatars/default.jpg') : '/images/avatars/default.jpg',
                authorPosts: user ? (user.posts || 0) : 0, // Assuming posts count is tracked, if not default to 0
                authorRank: user ? (user.rank || 'Academy Student') : 'Academy Student'
            };
        });

        res.render('news_info', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            viewNews: newsItem,
            comments: commentsWithUserData,
            currentPage: page,
            totalPages: totalPages,
            totalComments: totalComments
        });
    },

    postComment: async (req, res) => {
        if (!req.session.userId) {
            return res.status(401).send('Unauthorized');
        }

        const slug = req.params.slug;
        const { content } = req.body;
        const UserModel = require('../models/UserModel');
        const user = UserModel.findById(req.session.userId);

        if (user && content) {
            await CommentModel.create(slug, user.id, user.username, content);
            UserModel.incrementPosts(user.id);
        }

        res.redirect('/' + slug);
    }
};

module.exports = NewsController;
