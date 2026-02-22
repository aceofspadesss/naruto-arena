const UserModel = require('../models/UserModel');
const BattleModel = require('../models/BattleModel');
const LadderService = require('../services/LadderService');

class AuthController {
    static login(req, res) {
        const { username, password } = req.body;
        const user = UserModel.findByUsername(username);

        if (user && user.password === password) {
            // Reset match state
            UserModel.update(user.id, {
                startmatch: false,
                battleId: null,
                opponentId: null
            });

            req.session.userId = user.id;
            req.session.role = user.role;
            if (req.body.cookie === 'yes') {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            }
            res.redirect('/');
        } else {
            // Check if the login came from the login page or sidebar
            const referer = req.get('Referer') || '';
            if (referer.includes('/login')) {
                res.redirect('/login?error=Invalid username or password');
            } else {
                res.redirect('/?loginError=Invalid username or password');
            }
        }
    }

    static register(req, res) {
        const { username1, password1, password2, email, emailhide, discord, youtube, country, termsofuse, legaldisclaimer, privacypolicy } = req.body;

        // Validate agreements
        if (termsofuse !== '1' || legaldisclaimer !== '1' || privacypolicy !== '1') {
            return res.redirect('/register?error=agreements&message=You must agree to the Terms of use, Legal disclaimer, and Privacy policy');
        }

        // Validate username
        if (!username1 || username1.length < 3 || username1.length > 17) {
            return res.redirect('/register?error=username&message=Username must be between 3 and 17 characters');
        }

        // Check if user exists
        if (UserModel.findByUsername(username1)) {
            return res.redirect('/register?error=username&message=Username already exists');
        }

        // Validate password
        if (!password1 || password1.length < 3) {
            return res.redirect('/register?error=password&message=Password must be at least 3 characters');
        }

        // Check password confirmation
        if (password1 !== password2) {
            return res.redirect('/register?error=password2&message=Passwords do not match');
        }

        // Validate email
        if (!email || !email.includes('@')) {
            return res.redirect('/register?error=email&message=Please enter a valid email address');
        }

        const newUser = {
            id: Date.now().toString(), // String ID consistent with others
            username: username1,
            password: password1,
            email: email,
            emailHidden: emailhide === '1',
            discord: discord || '',
            youtube: youtube || '',
            country: country || '',
            role: "member",
            characters: [],
            wins: 0,
            losses: 0,
            streak: 0,                  // Current win/loss streak
            rank: "Academy Student",  // Unranked until first win
            ladderPosition: null,     // null = unranked
            level: 1,
            registeredOn: Date.now()  // Registration timestamp
        };

        UserModel.create(newUser);
        req.session.userId = newUser.id;
        req.session.role = newUser.role;
        res.redirect('/');
    }

    static logout(req, res) {
        // If the player is in an active battle, end it with them as the loser
        if (req.session.userId) {
            const user = UserModel.findById(req.session.userId);
            if (user && user.battleId) {
                const battle = BattleModel.findById(user.battleId);
                if (battle && !battle.winner) {
                    // Find opponent
                    const opponentId = Object.keys(battle.players)
                        .find(pid => String(pid) !== String(user.id));

                    if (opponentId) {
                        // End battle — opponent wins
                        battle.winner = opponentId;
                        battle.status = 'finished';
                        BattleModel.update(user.battleId, battle);

                        console.log(`[Auth] Player ${user.id} logged out during battle ${user.battleId}. Winner: ${opponentId}`);

                        // Update win/loss/streak stats
                        const users = UserModel.getUsers();
                        const winner = users.find(u => String(u.id) === String(opponentId));
                        const loser = users.find(u => String(u.id) === String(user.id));

                        if (winner) {
                            winner.wins = (winner.wins || 0) + 1;
                            const prevStreak = winner.streak || 0;
                            winner.streak = prevStreak >= 0 ? prevStreak + 1 : 1;
                        }
                        if (loser) {
                            loser.losses = (loser.losses || 0) + 1;
                            const prevStreak = loser.streak || 0;
                            loser.streak = prevStreak <= 0 ? prevStreak - 1 : -1;
                        }
                        UserModel.saveUsers(users);

                        // Process ladder
                        if (winner && loser) {
                            LadderService.processMatchResult(opponentId, user.id);
                        }
                    }
                }

                // Clean up match state
                UserModel.update(user.id, {
                    startmatch: false,
                    battleId: null,
                    opponentId: null
                });
            }
        }

        req.session.destroy();
        res.redirect('/');
    }
}

module.exports = AuthController;
