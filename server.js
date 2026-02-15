const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const apiRoutes = require('./src/routes/api');
const pageRoutes = require('./src/routes/pages');

const { PORT, SESSION_SECRET, VERSION } = require('./src/config');
const { viewsDir, publicDir, publicPath } = require('./src/utils/paths');

const app = express();
const NewsModel = require('./src/models/NewsModel');


// View Engine
app.set('view engine', 'ejs');
app.set('views', viewsDir);

// Middleware
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Static files
// Static files served from public folder (ruffle, swf, css, js, etc.)
app.use(express.static(publicDir));
// Also serve images at /game/images for SWF client which uses relative paths
app.use('/game/images', express.static(publicPath('images')));

const activeUser = require('./src/middleware/activeUser');

// Global Middleware for News
app.use(async (req, res, next) => {
    try {
        const news = await NewsModel.getLatest(5);
        res.locals.news = news;
    } catch (error) {
        console.error('Error fetching news for sidebar:', error);
        res.locals.news = [];
    }
    next();
});

const PollModel = require('./src/models/PollModel');
const CommentModel = require('./src/models/CommentModel');

// Global Middleware for Polls
app.use(async (req, res, next) => {
    try {
        const latestPoll = await PollModel.getLatest();
        let hasVoted = false;
        let pollCommentCount = 0;

        if (latestPoll) {
            if (req.session.userId) {
                hasVoted = await PollModel.hasVoted(latestPoll.id, req.session.userId);
            }
            const pollSlug = latestPoll.question.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            pollCommentCount = CommentModel.countByNewsSlug(pollSlug);
        }

        res.locals.poll = latestPoll;
        res.locals.hasVoted = hasVoted;
        res.locals.pollCommentCount = pollCommentCount;
    } catch (error) {
        console.error('Error fetching poll for sidebar:', error);
        res.locals.poll = null;
        res.locals.hasVoted = false;
        res.locals.pollCommentCount = 0;
    }
    next();
});

// Routes
app.use(activeUser);
app.use('/', pageRoutes);
app.use('/', apiRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (version: ${VERSION})`);
});
