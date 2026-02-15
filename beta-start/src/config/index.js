const path = require('path');

module.exports = {
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
        USERS: path.resolve(__dirname, '../../data/users.json'),
        BATTLES: path.resolve(__dirname, '../../data/battles.json'),
        CHARACTERS: path.resolve(__dirname, '../../data/characters.json'),
        MESSAGES: path.resolve(__dirname, '../../data/messages.json')
    },
    AI_ENABLED: true,
    AI_CONFIG: {
        VENDETTA_RATIO: 5,
        AGGRESSION_THRESHOLD: 2
    }
};
