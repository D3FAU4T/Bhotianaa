export interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    type: "",
    broadcaster_type: "partner"
    description: string;
    profile_image_url: string; // https://static-cdn.jtvnw.net/jtv_user_pictures/8a6381c7-d0c0-4576-b179-38bd5ce1d6af-profile_image-300x300.png
    offline_image_url: string; // https://static-cdn.jtvnw.net/jtv_user_pictures/3f13ab61-ec78-4fe6-8481-8682cb3b0ac2-channel_offline_image-1920x1080.png
    view_count: number;
    email: string;
    created_at: string; // 2016-12-14T20:32:28Z
}

export interface TwitchChannel {
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
    broadcaster_language: "en";
    game_id: string;
    game_name: string;
    title: string;
    delay: number;
    tags: string[]; // ["DevsInTheKnow"]
    content_classification_labels: string[]; // ["Gambling", "DrugsIntoxication", "MatureGame"],
    is_branded_content: boolean
}

export interface TwitchGame {
    id: string;
    name: string;
    box_art_url: string; // https://static-cdn.jtvnw.net/ttv-boxart/512821-{width}x{height}.jpg
    igdb_id: string;
}

export interface TwitchAPIStandardError {
    error: string;
    status: number;
    message: string;
}

export interface StreamGoodClips {
    creator_name: string;
    clip_url: string;
    game_title: string;
    title: string;
    created_at: string;
    duration: number;
    channel: string;
    is_overriden: boolean;
}

export interface StreamGoodClipsError {
    errors: {
        value: string;
        msg: string;
        param: string;
        location: string;
    }[]
}

export interface TwitchAuth {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string[];
    token_type: "bearer"
}