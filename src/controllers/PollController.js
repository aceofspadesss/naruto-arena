const PollModel = require('../models/PollModel');
const CommentModel = require('../models/CommentModel');
const UserModel = require('../models/UserModel');
const { publicPath } = require('../utils/paths');

const PollController = {
    // Admin: List all polls
    list: async (req, res) => {
        const polls = await PollModel.getAll();
        res.render('admin/polls/index', { polls });
    },

    // Admin: Show create form
    createPage: (req, res) => {
        res.render('admin/polls/create');
    },

    // Admin: Handle creation
    createAction: async (req, res) => {
        const { question, options } = req.body;

        let optionList = [];
        if (typeof options === 'string') {
            optionList = options.split(/\r?\n/).map(o => o.trim()).filter(o => o);
        } else if (Array.isArray(options)) {
            optionList = options.filter(o => o && o.trim());
        }

        await PollModel.create(question, optionList);
        res.redirect('/admin/polls');
    },

    // Admin: Show edit form
    editPage: async (req, res) => {
        const poll = await PollModel.getById(req.params.id);
        if (!poll) return res.redirect('/admin/polls');
        res.render('admin/polls/edit', { poll });
    },

    // Admin: Handle update
    editAction: async (req, res) => {
        const { question, options } = req.body;
        let optionList = [];
        if (typeof options === 'string') {
            optionList = options.split(/\r?\n/).map(o => o.trim()).filter(o => o);
        } else if (Array.isArray(options)) {
            optionList = options.filter(o => o && o.trim());
        }

        await PollModel.update(req.params.id, question, optionList);
        res.redirect('/admin/polls');
    },

    // Admin: Handle delete
    deleteAction: async (req, res) => {
        await PollModel.delete(req.params.id);
        res.redirect('/admin/polls');
    },

    // Public: Vote
    voteAction: async (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/');
        }

        const { optionIndex } = req.body;
        const success = await PollModel.vote(req.params.id, parseInt(optionIndex), req.session.userId);

        res.redirect(req.get('Referer') || '/');
    },

    // Public: Poll Page
    pollPage: async (req, res, next) => {
        const slug = req.params.slug;
        const poll = await PollModel.getBySlug(slug);

        if (!poll) {
            return next();
        }
        poll.slug = slug;

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

        let userVoted = false;
        if (req.session.userId) {
            userVoted = await PollModel.hasVoted(poll.id, req.session.userId);
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
                authorPosts: user ? (user.posts || 0) : 0,
                authorRank: user ? (user.rank || 'Academy Student') : 'Academy Student'
            };
        });

        res.render('poll_info', {
            user: req.session.userId ? UserModel.findById(req.session.userId)?.username : null,
            role: req.session.role,
            randomHeaderImage,
            statistics,
            randomScreenshot,
            viewPoll: poll,
            userVoted,
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
        const user = UserModel.findById(req.session.userId);

        if (user && content) {
            await CommentModel.create(slug, user.id, user.username, content);
            UserModel.incrementPosts(user.id);
        }

        res.redirect('/' + slug);
    }
};

module.exports = PollController;
