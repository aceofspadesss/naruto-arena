const NewsModel = require('../models/NewsModel');
const PollModel = require('../models/PollModel');
const CharacterModel = require('../models/CharacterModel');
const BalanceChangesModel = require('../models/BalanceChangesModel');

const SearchService = {
    async search(query) {
        if (!query || query.length < 3) {
            return [];
        }

        const lowerQuery = query.toLowerCase().trim();
        const results = [];

        // 1. Search Static Pages
        const staticPages = [
            { title: 'Game Manual', url: '/game-manual', content: 'Game manual and instructions', keywords: ['game', 'manual', 'help', 'guide'] },
            { title: 'FAQ', url: '/faq', content: 'Frequently Asked Questions', keywords: ['faq', 'questions', 'help'] },
            { title: 'The Basics', url: '/the-basics', content: 'Basic game information', keywords: ['basics', 'guide', 'start'] },
            { title: 'Contact', url: '/contact', content: 'Contact the staff', keywords: ['contact', 'email', 'support'] },
            { title: 'Privacy Policy', url: '/privacy-policy', content: 'Privacy Policy', keywords: ['privacy', 'policy', 'legal'] },
            { title: 'Legal Disclaimer', url: '/legal-disclaimer', content: 'Legal Disclaimer', keywords: ['legal', 'disclaimer'] },
            { title: 'Terms of Use', url: '/terms-of-use', content: 'Terms of Use', keywords: ['terms', 'use', 'rules'] },
            { title: 'Member List', url: '/memberlist', content: 'List of all members', keywords: ['members', 'users', 'players'] },
            { title: 'Ninja Ladder', url: '/the-ninja-ladder', content: 'The Ninja Ladder, rankings and stats', keywords: ['ladder', 'rankings', 'top'] },
            { title: 'Characters & Skills', url: '/characters-and-skills', content: 'List of all characters and skills', keywords: ['characters', 'skills', 'abilities'] }
        ];

        staticPages.forEach(page => {
            let relevance = 0;
            if (page.title.toLowerCase().includes(lowerQuery)) relevance += 50;
            if (page.content.toLowerCase().includes(lowerQuery)) relevance += 20;
            if (page.keywords.some(k => k.includes(lowerQuery))) relevance += 30;

            if (relevance > 0) {
                results.push({
                    title: page.title,
                    url: page.url,
                    snippet: page.content,
                    relevance,
                    type: 'Page'
                });
            }
        });

        // 2. Search News
        try {
            const news = await NewsModel.getAll();
            news.forEach(item => {
                let relevance = 0;
                if (item.title.toLowerCase().includes(lowerQuery)) relevance += 40;
                if (item.content.toLowerCase().includes(lowerQuery)) relevance += 20;

                if (relevance > 0) {
                    // Create a slug if not present (assuming model might not always have it persisted, but let's generate on fly if needed)
                    // The view uses slugs. NewsModel.getLatest does generate them.
                    const slug = item.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                    // Assuming News URL structure, usually it's /news-title-slug
                    // Standard routing seems to be /:slug for character/poll/news

                    // Truncate content for snippet
                    const snippet = item.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...';

                    results.push({
                        title: item.title,
                        url: `/${slug}`,
                        snippet: snippet,
                        relevance,
                        type: 'News'
                    });
                }
            });
        } catch (e) {
            console.error('Error searching news:', e);
        }

        // 3. Search Polls
        try {
            const polls = await PollModel.getAll();
            polls.forEach(item => {
                let relevance = 0;
                if (item.question.toLowerCase().includes(lowerQuery)) relevance += 40;

                if (relevance > 0) {
                    const slug = item.question.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                    results.push({
                        title: item.question,
                        url: `/${slug}`,
                        snippet: 'Poll: ' + item.question,
                        relevance,
                        type: 'Poll'
                    });
                }
            });
        } catch (e) {
            console.error('Error searching polls:', e);
        }

        // 4. Search Characters
        try {
            const characters = CharacterModel.findAll();
            characters.forEach(char => {
                let relevance = 0;
                if (char.name.toLowerCase().includes(lowerQuery)) relevance += 60; // Higher relevance for characters
                if (char.description && char.description.toLowerCase().includes(lowerQuery)) relevance += 20;

                // Check skills
                if (char.skills) {
                    const hasSkillMatch = char.skills.some(s =>
                        s.name.toLowerCase().includes(lowerQuery) ||
                        (s.description && s.description.toLowerCase().includes(lowerQuery))
                    );
                    if (hasSkillMatch) relevance += 20;
                }

                if (relevance > 0) {
                    const slug = char.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                    results.push({
                        title: char.name,
                        url: `/${slug}`,
                        snippet: char.description ? char.description.substring(0, 150) + '...' : 'Character info',
                        relevance,
                        type: 'Character'
                    });
                }
            });
        } catch (e) {
            console.error('Error searching characters:', e);
        }

        // 5. Search Balance Changes
        try {
            const balanceContent = await BalanceChangesModel.getContent();
            if (balanceContent && balanceContent.toLowerCase().includes(lowerQuery)) {
                results.push({
                    title: 'Latest Balance Changes',
                    url: '/latest-balance-changes',
                    snippet: 'Updates and balance changes to the game.',
                    relevance: 30,
                    type: 'Page'
                });
            }
        } catch (e) {
            console.error('Error searching balance changes:', e);
        }

        // Sort by relevance desc
        return results.sort((a, b) => b.relevance - a.relevance);
    }
};

module.exports = SearchService;
