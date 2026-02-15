const { PATHS } = require('../config');
const fs = require('fs');
const UserModel = require('./UserModel');

const MESSAGES_FILE = PATHS.MESSAGES;

class MessageModel {
    static getMessages() {
        if (!fs.existsSync(MESSAGES_FILE)) {
            return [];
        }
        try {
            return JSON.parse(fs.readFileSync(MESSAGES_FILE));
        } catch (e) {
            return [];
        }
    }

    static saveMessages(messages) {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    }

    static create(senderId, receiverUsername, subject, content) {
        const receiver = UserModel.findByUsername(receiverUsername);
        if (!receiver) {
            return { success: false, message: 'Receiver not found.' };
        }

        const messages = this.getMessages();
        const newMessage = {
            id: Date.now().toString(),
            senderId: senderId,
            receiverId: receiver.id,
            subject: subject,
            content: content,
            timestamp: Date.now(),
            isRead: false,
            isDeletedSender: false,
            isDeletedReceiver: false
        };

        messages.push(newMessage);
        this.saveMessages(messages);
        return { success: true, message: 'Message sent successfully.' };
    }

    static getInbox(userId) {
        const messages = this.getMessages();
        const users = UserModel.getUsers();

        return messages
            .filter(msg => String(msg.receiverId) === String(userId) && !msg.isDeletedReceiver)
            .map(msg => {
                const sender = users.find(u => String(u.id) === String(msg.senderId));
                return {
                    ...msg,
                    senderName: sender ? sender.username : 'Unknown',
                    rawTimestamp: msg.timestamp
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp); // Newest first
    }

    static getOutbox(userId) {
        const messages = this.getMessages();
        const users = UserModel.getUsers();

        return messages
            .filter(msg => String(msg.senderId) === String(userId) && !msg.isDeletedSender)
            .map(msg => {
                const receiver = users.find(u => String(u.id) === String(msg.receiverId));
                return {
                    ...msg,
                    receiverName: receiver ? receiver.username : 'Unknown',
                    rawTimestamp: msg.timestamp
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    static markAsRead(messageId, userId) {
        const messages = this.getMessages();
        const index = messages.findIndex(m => String(m.id) === String(messageId));

        if (index !== -1 && String(messages[index].receiverId) === String(userId)) {
            messages[index].isRead = true;
            this.saveMessages(messages);
            return true;
        }
        return false;
    }

    static delete(messageId, userId) {
        const messages = this.getMessages();
        const index = messages.findIndex(m => String(m.id) === String(messageId));

        if (index === -1) return false;

        const msg = messages[index];
        let changed = false;

        if (String(msg.senderId) === String(userId)) {
            msg.isDeletedSender = true;
            changed = true;
        }
        if (String(msg.receiverId) === String(userId)) {
            msg.isDeletedReceiver = true;
            changed = true;
        }

        if (changed) {
            // If both deleted, remove from array? Or keep for archival? Let's keep for now but filtered out.
            // Actually, to prevent file growth, if both deleted, remove.
            if (msg.isDeletedSender && msg.isDeletedReceiver) {
                messages.splice(index, 1);
            }
            this.saveMessages(messages);
            return true;
        }
        return false;
    }
}

module.exports = MessageModel;
