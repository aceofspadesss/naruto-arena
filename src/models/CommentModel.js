const fs = require('fs');
const { dataPath } = require('../utils/paths');
const dataFile = dataPath('comments.json');

const CommentModel = {
    getAll: () => {
        try {
            if (!fs.existsSync(dataFile)) {
                return [];
            }
            const data = fs.readFileSync(dataFile, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Error reading comments file:', err);
            return [];
        }
    },

    saveAll: (comments) => {
        try {
            fs.writeFileSync(dataFile, JSON.stringify(comments, null, 4));
            return true;
        } catch (err) {
            console.error('Error writing comments file:', err);
            return false;
        }
    },

    getByNewsSlug: (newsSlug, page = 1, limit = 15) => {
        const comments = CommentModel.getAll();
        const filteredComments = comments.filter(c => c.newsSlug === newsSlug).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        return filteredComments.slice(startIndex, endIndex);
    },

    create: async (newsSlug, userId, authorName, content) => {
        const comments = CommentModel.getAll();

        // Generate a simple ID
        const id = Date.now().toString();

        const newComment = {
            id,
            newsSlug,
            userId,
            authorName,
            content,
            createdAt: new Date().toISOString()
        };

        comments.push(newComment);
        CommentModel.saveAll(comments);
        return newComment;
    },

    countByNewsSlug: (newsSlug) => {
        const comments = CommentModel.getAll();
        return comments.filter(c => c.newsSlug === newsSlug).length;
    }
};

module.exports = CommentModel;
