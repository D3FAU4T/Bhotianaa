import type { EventSubMessage, EventSubNotification } from '../Typings/EventSub.d';

export default class EventSubWebSocket {
    private ws: WebSocket | null = null;
    private sessionId: string | null = null;
    private reconnectUrl: string | null = null;
    private keepaliveTimeout: Timer | null = null;
    private messageHandlers: Map<string, (notification: EventSubNotification) => void> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isIntentionalClose = false;

    constructor() { }

    public async connect(): Promise<void> {
        const url = this.reconnectUrl || 'wss://eventsub.wss.twitch.tv/ws';

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    console.log('🔌 EventSub WebSocket connected');
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ EventSub WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    console.log(`🔌 EventSub WebSocket closed: ${event.code} - ${event.reason}`);
                    this.clearKeepalive();

                    if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        setTimeout(() => this.connect(), 5000 * this.reconnectAttempts);
                    }
                };

                const welcomeHandler = (notification: EventSubNotification) => {
                    if (notification.metadata.message_type === 'session_welcome') {
                        this.reconnectAttempts = 0;
                        resolve();
                    }
                };

                // Temporary handler for welcome
                this.on('session_welcome', welcomeHandler);
                setTimeout(() => {
                    this.off('session_welcome', welcomeHandler);
                }, 10000);

            }

            catch (error) {
                console.error('Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }

    private handleMessage(data: string): void {
        try {
            const message: EventSubMessage = JSON.parse(data);
            const messageType = message.metadata.message_type;

            switch (messageType) {
                case 'session_welcome':
                    this.handleWelcome(message);
                    break;

                case 'session_keepalive':
                    this.handleKeepalive();
                    break;

                case 'notification':
                    this.handleNotification(message);
                    break;

                case 'session_reconnect':
                    this.handleReconnect(message);
                    break;

                case 'revocation':
                    this.handleRevocation(message);
                    break;

                default:
                    console.warn('Unknown message type:', messageType);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    private handleWelcome(message: EventSubMessage): void {
        if (message.payload.session) {
            this.sessionId = message.payload.session.id;
            this.reconnectUrl = message.payload.session.reconnect_url || null;

            const keepaliveTimeoutSeconds = message.payload.session.keepalive_timeout_seconds || 10;
            this.resetKeepalive(keepaliveTimeoutSeconds);

            console.log(`✅ EventSub session established: ${this.sessionId}`);

            // Emit welcome event
            const handler = this.messageHandlers.get('session_welcome');
            if (handler) {
                handler({
                    subscription: { type: 'session_welcome', version: '1', condition: {}, transport: { method: 'websocket', session_id: this.sessionId }, created_at: new Date().toISOString(), id: '' },
                    event: message.payload.session,
                    metadata: message.metadata
                });
            }
        }
    }

    private handleKeepalive(): void {
        this.resetKeepalive(10);
    }

    private handleNotification(message: EventSubMessage): void {
        if (message.payload.subscription && message.payload.event) {
            const subscriptionType = message.payload.subscription.type;
            const handler = this.messageHandlers.get(subscriptionType);

            if (handler) {
                const notification: EventSubNotification = {
                    subscription: message.payload.subscription,
                    event: message.payload.event,
                    metadata: message.metadata
                };
                handler(notification);
            }

            this.resetKeepalive(10);
        }
    }

    private handleReconnect(message: EventSubMessage): void {
        if (message.payload.session?.reconnect_url) {
            console.log('🔄 Reconnecting to new session...');
            this.reconnectUrl = message.payload.session.reconnect_url;
            this.connect();
        }
    }

    private handleRevocation(message: EventSubMessage): void {
        console.warn('⚠️ Subscription revoked:', message.payload.subscription?.type);
    }

    private resetKeepalive(timeoutSeconds: number): void {
        this.clearKeepalive();

        const timeoutMs = (timeoutSeconds + 10) * 1000;
        this.keepaliveTimeout = setTimeout(() => {
            console.warn('⚠️ Keepalive timeout - connection may be stale');
            this.close();
            if (!this.isIntentionalClose) {
                this.connect();
            }
        }, timeoutMs);
    }

    private clearKeepalive(): void {
        if (this.keepaliveTimeout) {
            clearTimeout(this.keepaliveTimeout);
            this.keepaliveTimeout = null;
        }
    }

    public on(subscriptionType: string, handler: (notification: EventSubNotification) => void): void {
        this.messageHandlers.set(subscriptionType, handler);
    }

    public off(subscriptionType: string, handler: (notification: EventSubNotification) => void): void {
        this.messageHandlers.delete(subscriptionType);
    }

    public getSessionId(): string | null {
        return this.sessionId;
    }

    public close(): void {
        this.isIntentionalClose = true;
        this.clearKeepalive();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
