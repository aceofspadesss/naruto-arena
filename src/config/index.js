require('dotenv').config();
const path = require('path');

const VERSION = process.env.VERSION || 'default';
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = VERSION === 'default'
    ? path.join(ROOT_DIR, 'data')
    : path.join(ROOT_DIR, 'versions', VERSION, 'data');

module.exports = {
    VERSION,
    PORT: process.env.PORT || 3000,
    SESSION_SECRET: process.env.SESSION_SECRET || 'naruto-arena-secret',
    SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
    SMTP: {
        HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
        PORT: parseInt(process.env.SMTP_PORT) || 587,
        USER: process.env.SMTP_USER || '',
        PASS: process.env.SMTP_PASS || '',
        FROM: process.env.SMTP_FROM || 'Naruto Arena <noreply@naruto-arena.com>'
    },
    PATHS: {
        USERS: path.join(DATA_DIR, 'users.json'),
        BATTLES: path.join(DATA_DIR, 'battles.json'),
        CHARACTERS: path.join(DATA_DIR, 'characters.json'),
        MESSAGES: path.join(DATA_DIR, 'messages.json')
    },
    AI_ENABLED: process.env.AI_ENABLED !== undefined ? process.env.AI_ENABLED === 'true' : true,
    AI_CONFIG: {
        VENDETTA_RATIO: 5,
        AGGRESSION_THRESHOLD: 2
    }
};
