import { server } from '../..';

export default class TwitchAPI {
    private broadcasterUserId: string;
    private botUserId: string;

    constructor(broadcasterUserId: string, botUserId: string) {
        this.broadcasterUserId = broadcasterUserId;
        this.botUserId = botUserId;
    }

    public async say(message: string): Promise<void> {
        try {
            const response = await fetch(`${server.url}api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    broadcaster_id: this.broadcasterUserId,
                    sender_id: this.botUserId,
                    message
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Failed to send message:', response.status, error);
                throw new Error(`Failed to send message: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    public async announce(message: string, color?: 'blue' | 'green' | 'orange' | 'purple' | 'primary'): Promise<void> {
        try {
            const response = await fetch(`${server.url}twitch/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, color })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Failed to send announcement:', response.status, error);
                throw new Error(`Failed to send announcement: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending announcement:', error);
            throw error;
        }
    }

    public async getUserId(username: string): Promise<string | null> {
        try {
            const response = await fetch(`${server.url}twitch/users?login=${username.toLowerCase()}`);

            if (!response.ok) {
                console.error('Failed to fetch user ID:', response.status);
                return null;
            }

            const data = await response.json() as { data: { id: string; login: string }[] };
            return data.data?.[0]?.id || null;
        } catch (error) {
            console.error('Error fetching user ID:', error);
            return null;
        }
    }
}
