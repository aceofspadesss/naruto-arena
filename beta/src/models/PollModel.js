const fs = require('fs').promises;
const path = require('path');

const POLLS_FILE = path.join(__dirname, '../../data/polls.json');

const PollModel = {
    async getAll() {
        try {
            const data = await fs.readFile(POLLS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },

    async saveAll(polls) {
        await fs.writeFile(POLLS_FILE, JSON.stringify(polls, null, 4));
    },

    async getLatest() {
        const polls = await this.getAll();
        if (polls.length === 0) return null;
        return polls[polls.length - 1];
    },

    async getById(id) {
        const polls = await this.getAll();
        return polls.find(p => p.id === id);
    },

    async getBySlug(slug) {
        const polls = await this.getAll();
        return polls.find(p => {
            const pollSlug = p.question.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return pollSlug === slug;
        });
    },

    async create(question, options) {
        const polls = await this.getAll();
        const newPoll = {
            id: Date.now().toString(),
            question,
            options: options.map(opt => ({ text: opt, votes: 0 })),
            createdAt: new Date().toISOString(),
            voters: [] // Track who voted
        };
        polls.push(newPoll);
        await this.saveAll(polls);
        return newPoll;
    },

    async update(id, question, options) {
        const polls = await this.getAll();
        const index = polls.findIndex(p => p.id === id);
        if (index === -1) return null;

        polls[index].question = question;

        // When options change significantly, we might want to reset voters?
        // User didn't specify, but typically yes if options change, votes are invalid.
        // But for "edit" where we just typo fix, we might want to keep voters.
        // Let's keep it simple: Reset voters if options length changes or significant edit.
        // Actually, previous implementation reset votes for new options.
        // Let's just preserve the existing `voters` array unless checking explicitly.
        // Given this is a simple system, I will leave logic as "preserve voters list".

        polls[index].options = options.map(optText => {
            const existing = polls[index].options.find(o => o.text === optText);
            return existing ? existing : { text: optText, votes: 0 };
        });

        await this.saveAll(polls);
        return polls[index];
    },

    async delete(id) {
        let polls = await this.getAll();
        polls = polls.filter(p => p.id !== id);
        await this.saveAll(polls);
    },

    async hasVoted(pollId, userId) {
        const poll = await this.getById(pollId);
        if (!poll || !poll.voters) return false;
        return poll.voters.includes(userId);
    },

    async vote(id, optionIndex, userId) {
        const polls = await this.getAll();
        const pollIndex = polls.findIndex(p => p.id === id);

        if (pollIndex === -1) return false;

        const poll = polls[pollIndex];

        // Ensure voters array exists (migration for existing polls)
        if (!poll.voters) poll.voters = [];

        if (poll.voters.includes(userId)) {
            return false; // Already voted
        }

        if (poll.options[optionIndex]) {
            poll.options[optionIndex].votes++;
            poll.voters.push(userId);
            await this.saveAll(polls);
            return true;
        }
        return false;
    }
};

module.exports = PollModel;
