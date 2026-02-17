const CharacterModel = require('../models/CharacterModel');

class CharacterController {
    static getAll(req, res) {
        res.json(CharacterModel.findAll());
    }

    static createOrUpdate(req, res) {
        const newChar = req.body;
        const chars = CharacterModel.findAll();

        const index = chars.findIndex(c => c.id == newChar.id);

        // Ensure locked is boolean
        if (newChar.locked !== undefined) {
            newChar.locked = (newChar.locked === true || newChar.locked === "true");
        } else {
            if (index === -1) newChar.locked = false;
        }

        if (index !== -1) {
            chars[index] = { ...chars[index], ...newChar };
        } else {
            chars.push(newChar);
        }

        CharacterModel.saveAll(chars);
        res.sendStatus(200);
    }

    static delete(req, res) {
        const id = req.params.id;
        let chars = CharacterModel.findAll();
        const initialLength = chars.length;
        chars = chars.filter(c => c.id != id);

        if (chars.length < initialLength) {
            CharacterModel.saveAll(chars);
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    }
    static async postComment(req, res) {
        if (!req.session.userId) {
            return res.status(401).send('Unauthorized');
        }

        const slug = req.params.slug;
        const { content } = req.body;
        const UserModel = require('../models/UserModel');
        const CommentModel = require('../models/CommentModel');
        const user = UserModel.findById(req.session.userId);

        if (user && content) {
            await CommentModel.create(slug, user.id, user.username, content);
            UserModel.incrementPosts(user.id);
        }

        res.redirect('/' + slug);
    }
}

module.exports = CharacterController;
