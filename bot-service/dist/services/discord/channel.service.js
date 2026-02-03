"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelService = exports.ChannelService = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
const DISCORD_API_URL = 'https://discord.com/api/v10';
class ChannelService {
    /**
     * Creates a private text channel for a user (ticket/cart style)
     */
    async createPrivateChannel(guildId, userId, botToken, channelName, categoryId) {
        try {
            const payload = {
                name: channelName,
                type: 0, // GUILD_TEXT
                permission_overwrites: [
                    {
                        id: guildId, // @everyone
                        type: 0, // Role
                        deny: '1024', // VIEW_CHANNEL
                    },
                    {
                        id: userId, // The user
                        type: 1, // Member
                        allow: '3072', // VIEW_CHANNEL + SEND_MESSAGES
                    }
                ]
            };
            if (categoryId) {
                payload.parent_id = categoryId;
            }
            logger_1.default.info(`[ChannelService] Creating channel in guild ${guildId} for user ${userId}`);
            logger_1.default.info(`[ChannelService] Payload: ${JSON.stringify(payload)}`);
            const response = await fetch(`${DISCORD_API_URL}/guilds/${guildId}/channels`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const error = await response.json();
                logger_1.default.error(`[ChannelService] Failed to create Discord channel. Status: ${response.status}`);
                logger_1.default.error(`[ChannelService] Error details: ${JSON.stringify(error)}`);
                return null;
            }
            const data = await response.json();
            logger_1.default.info(`[ChannelService] Channel created successfully: ${data.id}`);
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in createPrivateChannel:', error);
            return null;
        }
    }
    /**
     * Creates a private thread in a channel
     */
    async createPrivateThread(channelId, botToken, threadName) {
        try {
            const payload = {
                name: threadName,
                type: 12, // GUILD_PRIVATE_THREAD
                auto_archive_duration: 1440 // 24 hours
            };
            logger_1.default.info(`[ChannelService] Creating private thread in channel ${channelId}`);
            const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}/threads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const error = await response.json();
                logger_1.default.error(`[ChannelService] Failed to create thread. Status: ${response.status}`);
                logger_1.default.error(`[ChannelService] Error details: ${JSON.stringify(error)}`);
                return null;
            }
            const data = await response.json();
            logger_1.default.info(`[ChannelService] Thread created successfully: ${data.id}`);
            return data;
        }
        catch (error) {
            logger_1.default.error('Error in createPrivateThread:', error);
            return null;
        }
    }
    /**
     * Adds a member to a thread
     */
    async addMemberToThread(threadId, botToken, userId) {
        try {
            const response = await fetch(`${DISCORD_API_URL}/channels/${threadId}/thread-members/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bot ${botToken}`
                }
            });
            if (!response.ok) {
                const error = await response.json();
                logger_1.default.error(`[ChannelService] Failed to add member to thread. Status: ${response.status}`);
                logger_1.default.error(`[ChannelService] Error details: ${JSON.stringify(error)}`);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.default.error('Error in addMemberToThread:', error);
            return false;
        }
    }
    /**
     * Sends a message to a channel
     */
    async sendMessage(channelId, botToken, payload) {
        try {
            const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const error = await response.json();
                logger_1.default.error('Failed to send Discord message:', error);
                return null;
            }
            return await response.json();
        }
        catch (error) {
            return null;
        }
    }
    async deleteChannel(channelId, botToken) {
        try {
            logger_1.default.info(`[ChannelService] Deleting channel/thread ${channelId}`);
            const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bot ${botToken}`
                }
            });
            if (!response.ok) {
                const error = await response.json();
                logger_1.default.error(`[ChannelService] Failed to delete channel. Status: ${response.status}`);
                logger_1.default.error(`[ChannelService] Error details: ${JSON.stringify(error)}`);
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.default.error('Error in deleteChannel:', error);
            return false;
        }
    }
}
exports.ChannelService = ChannelService;
exports.channelService = new ChannelService();
