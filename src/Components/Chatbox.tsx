import React from "react";
import { useEffect, useRef, useState } from "react";
import type { CommandContext } from "../Typings/Bhotianaa";

type Props = {
    messages: Omit<CommandContext, 'args'>[];
    ws: WebSocket | null;
}

// Dynamic badge URL builder - constructs badge URLs from set_id and version id
const getBadgeUrl = (setId: string, versionId: string): string | null => {
    // Map of set_id to badge UUID patterns
    const badgeUuids: Record<string, string> = {
        'broadcaster': '5527c58c-fb7d-422d-b71b-f309dcb85cc1',
        'moderator': '3267646d-33f0-4b17-b3df-f923a41db1d0',
        'lead_moderator': '0822047b-65e0-46f2-94a9-d1091d685d33',
        'vip': 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec',
        'premium': 'bbbe0db0-a598-423e-86d0-f9fb98ca1933',
        'turbo': 'bd444ec6-8f34-4bf9-91f4-af1e3428d80f',
        'partner': 'd12a2e27-16f6-41d0-ab77-b780518f00a3',
        'staff': 'd97c37bd-a6f5-4c38-8f57-4e4bef88af34',
        'admin': '9ef7e029-4cdf-4d4d-a0d5-e2b3fb2583fe',
        'global_mod': '9384c43e-4ce7-4e94-b2a1-b93656896eba',
        'glhf-pledge': '3158e758-3cb4-43c5-94b3-7639810451c5',
        'no_audio': 'aef2cd08-f29b-45a1-8c12-d44d7fd5e6f0',
        'bot-badge': '3ffa9565-c35b-4cad-800b-041e60659cf2'
    };

    const uuid = badgeUuids[setId];
    if (uuid) {
        return `https://static-cdn.jtvnw.net/badges/v1/${uuid}/${versionId}`;
    }

    // Return null for unknown badges (subscriber, etc.)
    return null;
};

const Chatbox = ({ messages, ws }: Props) => {

    const chatboxRef = useRef<HTMLDivElement | null>(null);
    const [isScrollPaused, setIsScrollPaused] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const isAutoScrolling = useRef(false);

    const scrollToBottom = () => {
        if (chatboxRef.current) {
            isAutoScrolling.current = true;
            chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
            setTimeout(() => {
                isAutoScrolling.current = false;
            }, 100);
        }
    };

    const handleScroll = () => {
        if (isAutoScrolling.current) return;

        if (chatboxRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatboxRef.current;
            const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10; // Increased tolerance

            if (isAtBottom) {
                setIsScrollPaused(false);
                setShowScrollButton(false);
            } else {
                setIsScrollPaused(true);
                setShowScrollButton(true);
            }
        }
    };

    const handleScrollToBottomClick = () => {
        setIsScrollPaused(false);
        setShowScrollButton(false);
        scrollToBottom();
    };

    const sendMessage = () => {
        if (messageInput.trim() && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ message: messageInput }));
            setMessageInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Render badges from userstate
    const renderBadges = (userstate: any) => {
        if (!userstate.badges || !Array.isArray(userstate.badges)) return null;

        const badges = [];

        // EventSub badges come as an array of objects: [{ set_id: 'broadcaster', id: '1', info: '' }, ...]
        for (const badge of userstate.badges) {
            const badgeName = badge.set_id;
            const badgeId = badge.id;
            
            // Debug log to see what set_id we're receiving
            console.log(`Badge received - set_id: ${badgeName}, id: ${badgeId}, info: ${badge.info}`);
            
            const badgeUrl = getBadgeUrl(badgeName, badgeId);

            if (badgeUrl) {
                badges.push(
                    <img
                        key={`${badgeName}-${badgeId}`}
                        src={badgeUrl}
                        alt={badgeName}
                        title={badgeName.charAt(0).toUpperCase() + badgeName.slice(1).replace('_', ' ')}
                        style={{
                            width: '18px',
                            height: '18px',
                            marginRight: '4px',
                            verticalAlign: 'middle',
                            display: 'inline-block'
                        }}
                    />
                );
            } else if (badgeName === 'subscriber') {
                // For subscriber badges, show a generic subscriber icon with months
                badges.push(
                    <span
                        key={`${badgeName}-${badgeId}`}
                        title={`Subscriber (${badgeId} months)`}
                        style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            marginRight: '4px',
                            verticalAlign: 'middle',
                            backgroundColor: '#9147ff',
                            borderRadius: '3px',
                            textAlign: 'center',
                            lineHeight: '18px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: 'white'
                        }}
                    >
                        ★
                    </span>
                );
            } else {
                // Log unknown badges so we can add them later
                console.warn(`Unknown badge set_id: ${badgeName} with id: ${badgeId}`);
            }
        }

        return badges;
    };

    // Parse message and render emotes
    const parseMessage = (message: string, emotes: any) => {
        if (!emotes) {
            return <span>{message}</span>;
        }

        // Create an array of message parts with their positions
        const parts: Array<{ type: 'text' | 'emote', content: string, start: number, end: number, emoteId?: string }> = [];

        // Parse emote positions
        // emotes format: { "25": ["0-4", "6-10"], "1902": ["12-19"] }
        for (const [emoteId, positions] of Object.entries(emotes)) {
            for (const position of positions as string[]) {
                const [startStr, endStr] = position.split('-');
                const start = Number(startStr);
                const end = Number(endStr);

                if (!isNaN(start) && !isNaN(end)) {
                    parts.push({
                        type: 'emote',
                        content: message.substring(start, end + 1),
                        start,
                        end: end + 1,
                        emoteId
                    });
                }
            }
        }

        // Sort by start position
        parts.sort((a, b) => a.start - b.start);

        // Fill in text parts between emotes
        const result: React.JSX.Element[] = [];
        let lastEnd = 0;

        parts.forEach((part, index) => {
            // Add text before this emote
            if (part.start > lastEnd) {
                const textContent = message.substring(lastEnd, part.start);
                result.push(<span key={`text-${lastEnd}`}>{textContent}</span>);
            }

            // Add emote
            result.push(
                <img
                    key={`emote-${index}-${part.emoteId}`}
                    src={`https://static-cdn.jtvnw.net/emoticons/v2/${part.emoteId}/default/dark/1.0`}
                    alt={part.content}
                    title={part.content}
                    style={{
                        height: '28px',
                        verticalAlign: 'middle',
                        margin: '0 2px'
                    }}
                />
            );

            lastEnd = part.end;
        });

        // Add remaining text after last emote
        if (lastEnd < message.length) {
            const textContent = message.substring(lastEnd);
            result.push(<span key={`text-${lastEnd}`}>{textContent}</span>);
        }

        return <>{result}</>;
    };

    useEffect(() => {
        if (!isScrollPaused) {
            scrollToBottom();
        }
    }, [messages, isScrollPaused]);

    return (
        <aside className="block">
            <h2>Messages</h2>
            <div className="chatbox" ref={chatboxRef} onScroll={handleScroll}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    {messages.map((msg, index) => (
                        <>
                            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                {renderBadges(msg.userstate)}
                                <strong style={{ color: msg.userstate.color, marginRight: '4px' }}>
                                    {msg.userstate.user_name}:
                                </strong>
                                <span style={{ wordBreak: 'break-word', flex: 1 }}>
                                    {parseMessage(msg.message, {})}
                                </span>
                            </div>
                        </>
                    ))}
                </div>
            </div>
            <div style={{ position: "relative" }}>
                <button
                    className="pauseChat"
                    hidden={!showScrollButton}
                    onClick={handleScrollToBottomClick}
                >
                    Scroll to bottom
                </button>
                <div className="chat">
                    <textarea
                        placeholder="Send message as bot"
                        id="chat-input"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    ></textarea>
                    <button type="button" onClick={sendMessage}>Send</button>
                </div>
            </div>

        </aside>
    )
}

export default Chatbox;
