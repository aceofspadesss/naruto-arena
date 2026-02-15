const { PATHS } = require('../config');
const fs = require('fs');

const USERS_FILE = PATHS.USERS;

class UserModel {
    static getUsers() {
        if (!fs.existsSync(USERS_FILE)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(USERS_FILE));
    }

    static saveUsers(users) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    static findAll() {
        return this.getUsers();
    }

    static findById(id) {
        const users = this.getUsers();
        return users.find(u => String(u.id) === String(id));
    }

    static findByUsername(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username);
    }

    static findByEmail(email) {
        const users = this.getUsers();
        return users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    }

    /**
     * Set a password reset token for a user
     * @param {string} userId - User ID
     * @param {string} token - Reset token
     * @param {number} expiry - Token expiry timestamp
     */
    static setResetToken(userId, token, expiry) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index !== -1) {
            users[index].resetToken = token;
            users[index].resetTokenExpiry = expiry;
            this.saveUsers(users);
            return true;
        }
        return false;
    }

    /**
     * Find user by valid reset token
     * @param {string} token - Reset token
     * @returns {Object|null} User if token is valid and not expired
     */
    static findByResetToken(token) {
        const users = this.getUsers();
        const user = users.find(u => u.resetToken === token);
        if (user && user.resetTokenExpiry && user.resetTokenExpiry > Date.now()) {
            return user;
        }
        return null;
    }

    /**
     * Clear reset token after use
     * @param {string} userId - User ID
     */
    static clearResetToken(userId) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index !== -1) {
            delete users[index].resetToken;
            delete users[index].resetTokenExpiry;
            this.saveUsers(users);
            return true;
        }
        return false;
    }

    static create(userData) {
        const users = this.getUsers();
        userData.buddies = userData.buddies || []; // Ensure buddies array exists
        users.push(userData);
        this.saveUsers(users);
        return userData;
    }

    /**
     * Add a buddy to a user
     * @param {string} userId - User ID
     * @param {string} buddyUsername - Buddy Username
     * @returns {Object} result - { success: boolean, message: string }
     */
    static addBuddy(userId, buddyUsername) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => String(u.id) === String(userId));
        const buddy = users.find(u => u.username === buddyUsername);

        if (userIndex === -1) return { success: false, message: 'User not found.' };
        if (!buddy) return { success: false, message: 'User "' + buddyUsername + '" not found.' };
        if (String(userId) === String(buddy.id)) return { success: false, message: 'You cannot add yourself.' };

        const user = users[userIndex];
        user.buddies = user.buddies || [];

        if (user.buddies.includes(buddy.id)) return { success: false, message: 'User is already in your buddy list.' };

        user.buddies.push(buddy.id);
        this.saveUsers(users);
        return { success: true, message: 'Buddy added successfully.' };
    }

    /**
     * Remove a buddy from a user
     * @param {string} userId - User ID
     * @param {string} buddyId - Buddy ID
     * @returns {boolean} success
     */
    static removeBuddy(userId, buddyId) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => String(u.id) === String(userId));

        if (userIndex === -1) return false;

        const user = users[userIndex];
        if (!user.buddies) return false;

        const initialLength = user.buddies.length;
        user.buddies = user.buddies.filter(id => String(id) !== String(buddyId));

        if (user.buddies.length !== initialLength) {
            this.saveUsers(users);
            return true;
        }
        return false;
    }

    /**
     * Get buddies for a user
     * @param {string} userId - User ID
     * @returns {Array} buddies - Array of buddy objects with online status
     */
    static getBuddies(userId) {
        const users = this.getUsers();
        const user = users.find(u => String(u.id) === String(userId));

        if (!user || !user.buddies) return [];

        return user.buddies.map(buddyId => {
            const buddy = users.find(u => String(u.id) === String(buddyId));
            if (!buddy) return null;

            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;
            const isOnline = buddy.lastActive && (now - buddy.lastActive < fifteenMinutes);

            // Format Last Online date
            let lastOnline = 'Never';
            if (buddy.lastActive) {
                const date = new Date(buddy.lastActive);
                // Format: August 14, 2011 16:21 (mock style) -> Using local string for now
                const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                lastOnline = date.toLocaleDateString('en-US', options);
            }

            return {
                id: buddy.id,
                username: buddy.username,
                lastActivity: buddy.lastActivity ? 'Active within 15 mins' : 'Offline', // Simplify for now
                lastOnline: lastOnline,
                isOnline: isOnline
            };
        }).filter(b => b !== null);
    }

    static update(id, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(id));
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.saveUsers(users);
            return users[index];
        }
        return null;
    }

    static delete(id) {
        let users = this.getUsers();
        const initialLength = users.length;
        users = users.filter(u => String(u.id) !== String(id));
        if (users.length !== initialLength) {
            this.saveUsers(users);
            return true;
        }
        return false;
    }

    static updateLastActive(id) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(id));
        if (index !== -1) {
            // Only update if lastActive is unset or older than 1 minute to save IO
            const now = Date.now();
            if (!users[index].lastActive || now - users[index].lastActive > 60000) {
                users[index].lastActive = now;
                this.saveUsers(users);
            }
        }
    }

    static updateLocation(id, title, url) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(id));
        if (index !== -1) {
            const now = Date.now();
            users[index].lastActive = now;
            users[index].locationTitle = title;
            users[index].locationUrl = url;
            this.saveUsers(users);
        }
    }

    static getStatistics() {
        const users = this.getUsers();
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;

        const isOnline = (user) => user.lastActive && (now - user.lastActive < fifteenMinutes);

        return {
            totalMembers: users.length,
            adminsOnline: users.filter(u => u.role === 'admin' && isOnline(u)).length,
            moderatorsOnline: users.filter(u => u.role === 'moderator' && isOnline(u)).length,
            membersOnline: users.filter(u => isOnline(u)).length
        };
    }

    /**
     * Get all ranked users sorted by ladder position (ascending = best first)
     * @returns {Array} Sorted array of ranked users
     */
    static getRankedUsers() {
        const users = this.getUsers();
        return users
            .filter(u => u.ladderPosition !== null && u.ladderPosition !== undefined)
            .sort((a, b) => a.ladderPosition - b.ladderPosition);
    }

    /**
     * Update a user's ladder position
     * @param {string} userId - User ID
     * @param {number} newPosition - New ladder position
     */
    static updateLadderPosition(userId, newPosition) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index !== -1) {
            users[index].ladderPosition = newPosition;
            this.saveUsers(users);
            return users[index];
        }
        return null;
    }

    /**
     * Increment user's post count
     * @param {string} userId - User ID
     * @returns {number|null} new post count or null if user not found
     */
    static incrementPosts(userId) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(userId));
        if (index !== -1) {
            users[index].posts = (users[index].posts || 0) + 1;
            this.saveUsers(users);
            return users[index].posts;
        }
        return null;
    }

    /**
     * Get members with pagination, sorting, and filtering
     * @param {Object} options
     * @param {number} options.page - Page number (1-based)
     * @param {number} options.limit - Items per page
     * @param {string} options.sortField - Field to sort by
     * @param {string} options.sortOrder - 'asc' or 'desc'
     * @param {Object} options.filters - Filters to apply
     * @returns {Object} { members, totalMembers, totalPages, currentPage }
     */
    static getMembers({ page = 1, limit = 20, sortField = 'username', sortOrder = 'asc', filters = {} }) {
        let users = this.getUsers();

        // 1. Filtering
        if (filters.username) {
            const search = filters.username.toLowerCase();
            users = users.filter(u => u.username.toLowerCase().includes(search));
        }

        if (filters.posts) {
            const minPosts = parseInt(filters.posts);
            if (!isNaN(minPosts)) {
                users = users.filter(u => (u.posts || 0) > minPosts);
            }
        }

        if (filters.rank && filters.rank !== 'all') {
            users = users.filter(u => u.role === filters.rank);
        }

        if (filters.country && filters.country !== 'all') {
            users = users.filter(u => u.country === filters.country);
        }

        if (filters.onlinestatus && filters.onlinestatus !== 'all') {
            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;
            if (filters.onlinestatus === 'online') {
                users = users.filter(u => u.lastActive && (now - u.lastActive < fifteenMinutes));
            } else if (filters.onlinestatus === 'offline') {
                users = users.filter(u => !u.lastActive || (now - u.lastActive >= fifteenMinutes));
            }
        }

        // 2. Sorting
        users.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Handle specific fields
            if (sortField === 'username') {
                valA = valA ? valA.toLowerCase() : '';
                valB = valB ? valB.toLowerCase() : '';
            } else if (sortField === 'posts') {
                valA = valA || 0;
                valB = valB || 0;
            } else if (sortField === 'rank') {
                // Determine rank priority: admin > moderator > member
                const rankPriority = { 'admin': 3, 'moderator': 2, 'member': 1 };
                valA = rankPriority[a.role] || 0;
                valB = rankPriority[b.role] || 0;
            } else if (sortField === 'country') {
                valA = valA || '';
                valB = valB || '';
            } else if (sortField === 'onlinestatus') {
                // Sort by online status (online first)
                const now = Date.now();
                const fifteenMinutes = 15 * 60 * 1000;
                const isOnlineA = a.lastActive && (now - a.lastActive < fifteenMinutes);
                const isOnlineB = b.lastActive && (now - b.lastActive < fifteenMinutes);
                valA = isOnlineA ? 1 : 0;
                valB = isOnlineB ? 1 : 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Pagination
        const totalMembers = users.length;
        const totalPages = Math.ceil(totalMembers / limit);
        const safePage = Math.max(1, Math.min(page, totalPages || 1));
        const startIndex = (safePage - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMembers = users.slice(startIndex, endIndex);

        // Add display properties
        const membersWithStatus = paginatedMembers.map(user => {
            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;
            const isOnline = user.lastActive && (now - user.lastActive < fifteenMinutes);

            return {
                ...user,
                isOnline,
                rankImage: user.role === 'admin' ? '/images/layout/mem-admin.gif' :
                    user.role === 'moderator' ? '/images/layout/mem-mod.gif' :
                        '/images/layout/mem-member.gif'
            };
        });

        return {
            members: membersWithStatus,
            totalMembers,
            totalPages,
            currentPage: safePage
        };
    }
}

module.exports = UserModel;
