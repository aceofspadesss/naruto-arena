const fs = require('fs').promises;
const path = require('path');
const UserModel = require('./UserModel');
const CommentModel = require('./CommentModel');
const { dataPath } = require('../utils/paths');

const NEWS_FILE = dataPath('news.json');

const NewsModel = {
    async getAll() {
        try {
            const data = await fs.readFile(NEWS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },

    async saveAll(news) {
        await fs.writeFile(NEWS_FILE, JSON.stringify(news, null, 4));
    },

    async getLatest(count = 5) {
        const news = await this.getAll();
        // Sort by createdAt descending (newest first)
        const latestNews = news
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, count);

        // Resolve author IDs to usernames and get comment counts
        return latestNews.map(post => {
            const user = UserModel.findById(post.author);
            const slug = post.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const commentCount = CommentModel.countByNewsSlug(slug);

            return {
                ...post,
                authorName: user ? user.username : 'Unknown',
                slug,
                commentCount
            };
        });
    },

    async getById(id) {
        const news = await this.getAll();
        return news.find(n => n.id === id);
    },

    async getBySlug(slug) {
        const news = await this.getAll();
        const newsItem = news.find(n => {
            const newsSlug = n.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return newsSlug === slug;
        });
        if (newsItem) {
            return { ...newsItem, slug };
        }
        return null;
    },

    async create(title, content, author) {
        const news = await this.getAll();
        const newPost = {
            id: Date.now().toString(),
            title,
            content,
            author,
            createdAt: new Date().toISOString()
        };
        news.push(newPost);
        await this.saveAll(news);
        return newPost;
    },

    async update(id, title, content) {
        const news = await this.getAll();
        const index = news.findIndex(n => n.id === id);
        if (index === -1) return null;

        news[index].title = title;
        news[index].content = content;
        news[index].updatedAt = new Date().toISOString();

        await this.saveAll(news);
        return news[index];
    },

    async delete(id) {
        let news = await this.getAll();
        news = news.filter(n => n.id !== id);
        await this.saveAll(news);
    }
};

module.exports = NewsModel;
