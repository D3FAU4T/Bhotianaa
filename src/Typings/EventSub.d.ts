export interface EventSubMessage {
    metadata: {
        message_id: string;
        message_type: 'session_welcome' | 'session_keepalive' | 'notification' | 'session_reconnect' | 'revocation';
        message_timestamp: string;
        subscription_type?: string;
        subscription_version?: string;
    };
    payload: {
        session?: {
            id: string;
            status: string;
            connected_at: string;
            keepalive_timeout_seconds: number;
            reconnect_url?: string;
        };
        subscription?: EventSubSubscription;
        event?: any;
    };
}

export interface EventSubSubscription {
    id: string;
    type: string;
    version: string;
    status?: string;
    condition: Record<string, any>;
    transport: {
        method: 'websocket';
        session_id: string;
    };
    created_at: string;
    cost?: number;
}

export interface EventSubNotification {
    subscription: EventSubSubscription;
    event: any;
    metadata: EventSubMessage['metadata'];
}

export interface ChatMessageEvent {
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    chatter_user_id: string;
    chatter_user_login: string;
    chatter_user_name: string;
    message_id: string;
    message: {
        text: string;
        fragments: Array<{
            type: 'text' | 'cheermote' | 'emote' | 'mention';
            text: string;
            cheermote?: {
                prefix: string;
                bits: number;
                tier: number;
            };
            emote?: {
                id: string;
                emote_set_id: string;
                owner_id: string;
                format: string[];
            };
            mention?: {
                user_id: string;
                user_name: string;
                user_login: string;
            };
        }>;
    };
    color: string;
    badges: Array<{
        set_id: string;
        id: string;
        info: string;
    }>;
    message_type: 'text' | 'channel_points_highlighted' | 'channel_points_sub_only' | 'user_intro';
    cheer?: {
        bits: number;
    };
    reply?: {
        parent_message_id: string;
        parent_message_body: string;
        parent_user_id: string;
        parent_user_name: string;
        parent_user_login: string;
        thread_message_id: string;
        thread_user_id: string;
        thread_user_name: string;
        thread_user_login: string;
    };
    channel_points_custom_reward_id?: string;
}

export interface ChatUserstate {
    user_id: string;
    user_login: string;
    user_name: string;
    color: string;
    badges: Array<{
        set_id: string;
        id: string;
        info: string;
    }>;
    isModerator: boolean;
    isSubscriber: boolean;
    isBroadcaster: boolean;
}
