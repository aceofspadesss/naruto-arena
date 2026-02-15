const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/AuthController');
const GameController = require('../controllers/GameController');
const CharacterController = require('../controllers/CharacterController');

// Auth
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/logout', AuthController.logout);

// Game Engine
// Game Engine
router.all('/engine.php', (req, res) => GameController.handleEngineRequest(req, res));
router.all('/game/engine.php', (req, res) => GameController.handleEngineRequest(req, res));

// Characters
router.get('/api/characters', CharacterController.getAll);
router.post('/api/characters', CharacterController.createOrUpdate);
router.delete('/api/characters/:id', CharacterController.delete);

module.exports = router;
