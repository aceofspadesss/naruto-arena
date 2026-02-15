const { PATHS } = require('../config');
const fs = require('fs');

const BATTLES_FILE = PATHS.BATTLES;

class BattleModel {
    static getBattles() {
        if (!fs.existsSync(BATTLES_FILE)) return {};
        const data = fs.readFileSync(BATTLES_FILE, 'utf8');
        return data ? JSON.parse(data) : {};
    }

    static saveBattles(data) {
        fs.writeFileSync(BATTLES_FILE, JSON.stringify(data, null, 2));
    }

    static findAll() {
        return this.getBattles();
    }

    static findById(id) {
        const battles = this.getBattles();
        return battles[id];
    }

    static create(id, battleData) {
        const battles = this.getBattles();
        battles[id] = battleData;
        this.saveBattles(battles);
        return battleData;
    }

    static update(id, battleData) {
        const battles = this.getBattles();
        if (battles[id]) {
            battles[id] = battleData;
            this.saveBattles(battles);
            return battleData;
        }
        return null;
    }

    static saveAll(battles) {
        this.saveBattles(battles);
    }
}

module.exports = BattleModel;
