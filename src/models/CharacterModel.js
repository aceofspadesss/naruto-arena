const { PATHS } = require('../config');
const fs = require('fs');

const CHARACTERS_FILE = PATHS.CHARACTERS;

class CharacterModel {
    static getCharacters() {
        if (!fs.existsSync(CHARACTERS_FILE)) {
            return [];
        }
        try {
            const data = fs.readFileSync(CHARACTERS_FILE, 'utf8');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    static saveCharacters(chars) {
        fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(chars, null, 2));
    }

    static findAll() {
        const chars = this.getCharacters();
        console.log(`[CharacterModel] Loaded ${chars.length} characters.`);
        return chars;
    }

    static findById(id) {
        const chars = this.getCharacters();
        // Clean ID (sometimes comes as "00" or int)
        const cleanId = String(id).replace(/\D/g, '');
        return chars.find(c => c.id == cleanId);
    }

    static saveAll(chars) {
        this.saveCharacters(chars);
    }
}

module.exports = CharacterModel;
