const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const TEMPLATES_DIR = path.join(__dirname, '../../public/images/myplayercard/templates');
const OUTPUT_DIR = path.join(__dirname, '../../public/images/myplayercard');
const NINJA_RANKS_DIR = path.join(__dirname, '../../public/images/ninjaranks');
const CHARACTERS_DIR = path.join(__dirname, '../../public/game/images/characters');
const PUBLIC_DIR = path.join(__dirname, '../../public');
const FONTS_DIR = path.join(__dirname, '../../public/fonts');

// Custom font configuration
const CUSTOM_FONT_PATH = path.resolve(FONTS_DIR, '34_Franklin Gothic Medium Cond.ttf');
const CUSTOM_FONT_FAMILY = 'FranklinGothic';

// Register custom font with @napi-rs/canvas
if (fs.existsSync(CUSTOM_FONT_PATH)) {
    GlobalFonts.registerFromPath(CUSTOM_FONT_PATH, CUSTOM_FONT_FAMILY);
    console.log('Custom font registered:', CUSTOM_FONT_FAMILY);
}

// Rank to image filename mapping
const RANK_IMAGE_MAP = {
    'Academy Student': 'academystudent',
    'Genin': 'genin',
    'Chuunin': 'chuunin',
    'Special Jounin': 'specialjounin',
    'Jounin': 'jounin',
    'Sannin': 'sannin',
    'Legendary Sannin': 'sannin',
    'Hokage': 'hokage',
    'Kage': 'hokage'
};

/**
 * Get the user's avatar path
 * @param {object} user - User object
 * @returns {string|null} Path to avatar file or null if not found
 */
function getUserAvatarPath(user) {
    // Check user's stored avatar path (web path like /images/avatars/preset/...)
    if (user.avatar) {
        // Convert web path to filesystem path
        const avatarPath = path.join(PUBLIC_DIR, user.avatar);
        if (fs.existsSync(avatarPath)) {
            return avatarPath;
        }
    }

    // Check for custom avatar by user ID
    const customAvatarPath = path.join(PUBLIC_DIR, 'images', 'avatars', `${user.id}.jpg`);
    if (fs.existsSync(customAvatarPath)) {
        return customAvatarPath;
    }

    // Fallback to default avatar
    const defaultAvatarPath = path.join(PUBLIC_DIR, 'images', 'avatars', 'default.jpg');
    if (fs.existsSync(defaultAvatarPath)) {
        return defaultAvatarPath;
    }

    return null;
}

/**
 * Generate text overlay as PNG buffer using @napi-rs/canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {object} user - User data
 * @returns {Buffer} PNG buffer with rendered text
 */
function generateTextOverlay(width, height, user) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Disable anti-aliasing for crisper text (like the example)
    ctx.imageSmoothingEnabled = false;
    ctx.antialias = 'none';

    // Use the custom font
    const fontSize = 14;
    ctx.font = `${fontSize}px ${CUSTOM_FONT_FAMILY}`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    // Letter spacing (in pixels) - adjust this value to fine-tune
    const letterSpacing = -0.11;

    /**
     * Draw text with custom letter spacing
     * @param {string} text - Text to draw
     * @param {number} x - Starting X position
     * @param {number} y - Y position
     */
    function fillTextWithSpacing(text, x, y) {
        let currentX = x;
        for (const char of text) {
            ctx.fillText(char, currentX, y);
            currentX += ctx.measureText(char).width + letterSpacing;
        }
    }

    // Build user stats
    const username = user.username || 'Unknown';
    const rank = user.rank || 'Genin';
    const ladderRank = user.ladderPosition || 'Unranked';
    const wins = user.wins || 0;
    const losses = user.losses || 0;
    const streak = user.streak || 0;

    // Text positioning
    const textX = 87;
    const lineHeight = 14;
    const startY = 11;

    // Draw text lines with letter spacing
    fillTextWithSpacing(username, textX, startY);
    fillTextWithSpacing(rank, textX, startY + lineHeight);
    fillTextWithSpacing(`Ladder Rank: ${ladderRank}`, textX, startY + (lineHeight * 2));
    fillTextWithSpacing(`Record: ${wins} - ${losses}`, textX, startY + (lineHeight * 3));
    fillTextWithSpacing(`Streak: ${streak}`, textX, startY + (lineHeight * 4));

    return canvas.toBuffer('image/png');
}

/**
 * Generate a player card image for a user
 * @param {object} user - User object with stats
 * @param {boolean} showCharacters - Whether to show last 3 characters
 * @returns {Promise<string>} Path to generated image
 */
async function generatePlayerCard(user, showCharacters = false) {
    try {
        // Determine which template to use (showCharacters enables the template with character slots)
        const templateName = showCharacters ? 'with-characters.jpg' : 'no-characters.jpg';
        const templatePath = path.join(TEMPLATES_DIR, templateName);

        // Verify template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        // Get template metadata for dimensions
        const templateMeta = await sharp(templatePath).metadata();
        const width = templateMeta.width;
        const height = templateMeta.height;

        // Generate text overlay using canvas
        const textOverlayBuffer = generateTextOverlay(width, height, user);

        // Start building composite operations
        const compositeOps = [];

        // Add user avatar to the left side (positioned at 7,7)
        const avatarPath = getUserAvatarPath(user);
        console.log('Avatar path:', avatarPath);
        if (avatarPath) {
            try {
                const avatarBuffer = await sharp(avatarPath)
                    .toBuffer();

                compositeOps.push({
                    input: avatarBuffer,
                    top: 7,
                    left: 7
                });
            } catch (avatarError) {
                console.error('Error loading avatar:', avatarError);
            }
        }

        // Add text overlay (PNG with transparency)
        compositeOps.push({
            input: textOverlayBuffer,
            top: 0,
            left: 0
        });

        // Add ninja rank icon
        const rankImageName = RANK_IMAGE_MAP[user.rank] || 'genin';
        const rankIconPath = path.join(NINJA_RANKS_DIR, `${rankImageName}.gif`);

        if (fs.existsSync(rankIconPath)) {
            try {
                // Convert GIF to PNG buffer for compositing
                const rankIconBuffer = await sharp(rankIconPath)
                    .png()
                    .toBuffer();

                compositeOps.push({
                    input: rankIconBuffer,
                    top: 58,
                    left: 198
                });
            } catch (iconError) {
                console.error('Error loading rank icon:', iconError);
            }
        }

        // Add character icons if enabled
        if (showCharacters) {
            // Use lastTeam if available, otherwise default to first 3 characters
            const team = (user.lastTeam && user.lastTeam.length === 3)
                ? user.lastTeam
                : ['1', '2', '3']; // Default to first 3 characters

            const characterXPositions = [354, 354, 354]; // X positions for 3 characters
            const characterYPositions = [5, 38, 72]; // Y positions for 3 characters

            for (let i = 0; i < 3; i++) {
                // Strip 'chary' prefix if present (convert 'chary6' to '6')
                const rawCharId = team[i];
                const charId = rawCharId.replace(/^chary/i, '');
                // Character icon path: game/images/characters/:character_id/avatarselection.jpg
                const charIconPath = path.join(CHARACTERS_DIR, charId, 'avatarselection.jpg');

                if (fs.existsSync(charIconPath)) {
                    try {
                        const charIconBuffer = await sharp(charIconPath)
                            .resize(26, 26, { fit: 'cover' })
                            .toBuffer();

                        compositeOps.push({
                            input: charIconBuffer,
                            top: characterYPositions[i],
                            left: characterXPositions[i]
                        });
                    } catch (charError) {
                        console.error(`Error loading character icon for ${charId}:`, charError);
                    }
                }
            }
        }

        // Generate the final image
        const outputPath = path.join(OUTPUT_DIR, `${user.id}.jpg`);

        await sharp(templatePath)
            .composite(compositeOps)
            .jpeg({ quality: 90 })
            .toFile(outputPath);

        console.log(`Player card generated: ${outputPath}`);
        return outputPath;

    } catch (error) {
        console.error('Error generating player card:', error);
        throw error;
    }
}

module.exports = {
    generatePlayerCard
};
