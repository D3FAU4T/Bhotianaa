import Chatbox from "./Chatbox";
import CommandBlock from "./CommandBlock";
import { useEffect, useRef, useState } from "react";
import type { CommandContext } from "../Typings/Bhotianaa";
import DynamicCommandsView from "./DynamicCommandsView";
import SystemCommandsView from "./SystemCommandsView";
import TimersView from "./TimersView";
import AccountsView from "./AccountsView";

const App = () => {
    const [messages, setMessages] = useState<Omit<CommandContext, 'args'>[]>([]);
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
    const [dynamicCommands, setDynamicCommands] = useState<Record<string, any>>({});

    const [systemCommands, setSystemCommands] = useState<Record<string, any>>({});
    const [timers, setTimers] = useState<Record<string, any>>({});

    const [accounts, setAccounts] = useState<{ broadcaster: { id: string } | null, bot: { id: string } | null } | null>(null);
    const [streamInfo, setStreamInfo] = useState<{ title: string, gameName: string, gameArt: string, channelName: string, isLive?: boolean } | null>(null);
    const [layoutOrder, setLayoutOrder] = useState<string[]>(['dynamicCommands', 'systemCommands', 'timers', 'accounts', 'streamInfo']);
    const [isEditMode, setIsEditMode] = useState(false);

    // For drag and drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const commandsWs = useRef<WebSocket | null>(null);

    const handleBlockClick = (blockType: string) => {
        setExpandedBlock(blockType);
    };

    const handleBackToGrid = () => {
        setExpandedBlock(null);
    };

    const fetchDynamicCommands = () => {
        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({ action: 'getAll' }));
        }
    };

    const fetchSystemCommands = () => {
        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({ action: 'getSystemCommands' }));
        }
    };

    const fetchTimers = () => {
        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({ action: 'getAllTimers' }));
        }
    };

    const renderExpandedContent = () => {
        switch (expandedBlock) {
            case 'dynamicCommands':
                return <DynamicCommandsView dynamicCommands={dynamicCommands} ws={commandsWs.current} />;
            case 'commands':
                return <SystemCommandsView systemCommands={systemCommands} />;
            case 'timers':
                return <TimersView timers={timers} ws={commandsWs.current} />;
            case 'accounts':
                return <AccountsView accounts={accounts} onRefresh={fetchAccounts} />;
            default:
                return (
                    <div style={{ padding: '2rem' }}>
                        <button
                            onClick={handleBackToGrid}
                            style={{
                                marginBottom: '1rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#7d2ee0',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            ← Back to Dashboard
                        </button>
                        <h1>Block Details</h1>
                        <p>More information about this block would go here.</p>
                    </div>
                );
        }
    };

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/whoami');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (e) {
            console.error("Failed to fetch accounts", e);
        }
    };

    useEffect(() => {
        fetchDynamicCommands();
        fetchAccounts();

        ws.current = new WebSocket(`ws://${location.host}/socket/chat`);

        ws.current.onmessage = (event) => {
            const messageStr = event.data;

            // Handle heartbeat - server sends 6, we respond with 9
            if (messageStr === '6') {
                ws.current?.send('9');
                return;
            }

            // Handle chat messages
            const data = JSON.parse(messageStr) as Omit<CommandContext, 'args'>;
            setMessages(prev => {
                const newMessages = [...prev, data];
                if (newMessages.length > 100) {
                    return newMessages.slice(-100);
                }
                return newMessages;
            });
        };

        return () => ws.current?.close();

    }, []);

    useEffect(() => {
        // Load layout from localStorage
        const savedLayout = localStorage.getItem('dashboardLayout');
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                if (Array.isArray(parsed) && parsed.length === 5) {
                    setLayoutOrder(parsed);
                }
            } catch (e) {
                console.error("Failed to parse saved layout", e);
            }
        }

        commandsWs.current = new WebSocket(`ws://${window.location.host}/socket/commands`);

        commandsWs.current.onopen = () => {
            fetchDynamicCommands();
            fetchSystemCommands();
            fetchTimers();
        };

        commandsWs.current.onmessage = (event) => {
            const messageStr = event.data;

            // Handle heartbeat - server sends 6, we respond with 9
            if (messageStr === '6') {
                commandsWs.current?.send('9');
                return;
            }

            const data = JSON.parse(messageStr);
            if (data.type === 'allCommands')
                setDynamicCommands(data.commands);

            else if (data.type === 'systemCommands')
                setSystemCommands(data.commands);

            else if (data.type === 'allTimers')
                setTimers(data.timers);

            else if (data.type === 'streamInfo')
                setStreamInfo(data.data);

            else if (data.error)
                console.error('Commands error:', data.error)
        };

        return () => commandsWs.current?.close();
    }, []);

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        if (!isEditMode) return;
        dragItem.current = position;
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        if (!isEditMode) return;
        dragOverItem.current = position;
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('dragging');

        if (!isEditMode || dragItem.current === null || dragOverItem.current === null) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }

        const newLayout = [...layoutOrder];
        const draggedItemContent = newLayout[dragItem.current];

        if (!draggedItemContent) return;

        newLayout.splice(dragItem.current, 1);
        newLayout.splice(dragOverItem.current, 0, draggedItemContent);

        dragItem.current = null;
        dragOverItem.current = null;
        setLayoutOrder(newLayout);
    };

    const toggleEditMode = () => {
        if (isEditMode) {
            // Save on exit
            localStorage.setItem('dashboardLayout', JSON.stringify(layoutOrder));
        }
        setIsEditMode(!isEditMode);
    };

    const renderBlockById = (id: string, index: number) => {
        const commonProps = {
            draggable: isEditMode,
            onDragStart: (e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, index),
            onDragEnter: (e: React.DragEvent<HTMLDivElement>) => handleDragEnter(e, index),
            onDragEnd: handleDragEnd,
            onDragOver: (e: React.DragEvent<HTMLDivElement>) => e.preventDefault(),
        };

        switch (id) {
            case 'dynamicCommands':
                return (
                    <div key="dynamicCommands" {...commonProps}>
                        <CommandBlock
                            value={Object.keys(dynamicCommands).length}
                            label="Dynamic Commands"
                            onClick={() => !isEditMode && handleBlockClick('dynamicCommands')}
                        />
                    </div>
                );
            case 'systemCommands':
                return (
                    <div key="systemCommands" {...commonProps}>
                        <CommandBlock
                            value={Object.keys(systemCommands).length}
                            label="System Commands"
                            onClick={() => !isEditMode && handleBlockClick('commands')}
                        />
                    </div>
                );
            case 'timers':
                return (
                    <div key="timers" {...commonProps}>
                        <CommandBlock
                            value={Object.keys(timers).length}
                            label="Timers"
                            onClick={() => !isEditMode && handleBlockClick('timers')}
                        />
                    </div>
                );
            case 'accounts':
                return (
                    <div key="accounts" {...commonProps}>
                        <CommandBlock
                            value="🔐"
                            label="Accounts"
                            onClick={() => !isEditMode && handleBlockClick('accounts')}
                        />
                    </div>
                );
            case 'streamInfo':
                return (
                    <div
                        key="streamInfo"
                        {...commonProps}
                        className="block"
                        style={{
                            gridColumn: "span 2",
                            background: streamInfo?.gameArt && streamInfo.isLive
                                ? `linear-gradient(135deg, rgba(15, 19, 26, 0.95) 0%, rgba(15, 19, 26, 0.85) 100%), url(${streamInfo.gameArt})`
                                : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: isEditMode ? 'grab' : 'default',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {streamInfo ? (
                            <>
                                <div style={{ zIndex: 2 }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: streamInfo.isLive ? '#ef5350' : '#888',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '0.5rem',
                                        fontWeight: '600'
                                    }}>
                                        {streamInfo.isLive ? 'LIVE NOW' : 'STREAM STATUS'}
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        marginBottom: '1rem',
                                        lineHeight: '1.3',
                                        color: '#fff',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        {streamInfo.isLive ? streamInfo.title : 'Stream is currently offline'}
                                    </h2>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    zIndex: 2
                                }}>
                                    {streamInfo.gameArt && (
                                        <img
                                            src={streamInfo.gameArt}
                                            alt={streamInfo.gameName}
                                            style={{
                                                width: '60px',
                                                height: '80px',
                                                objectFit: 'cover',
                                                borderRadius: '0.5rem',
                                                boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                    )}
                                    {streamInfo.isLive && (
                                        <div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: '#9146ff',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                fontWeight: '600',
                                                marginBottom: '0.25rem'
                                            }}>
                                                Playing
                                            </div>
                                            <div style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                            }}>
                                                {streamInfo.gameName}
                                            </div>
                                        </div>
                                    )}
                                    {!streamInfo.isLive && streamInfo.gameName !== 'Offline' && streamInfo.gameName !== 'Not Playing' && (
                                        <div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                color: '#888',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                fontWeight: '600',
                                                marginBottom: '0.25rem'
                                            }}>
                                                Last Seen Playing
                                            </div>
                                            <div style={{
                                                fontSize: '1.1rem',
                                                fontWeight: '600',
                                                color: '#ccc',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                            }}>
                                                {streamInfo.gameName}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: '#666',
                                fontSize: '0.9rem'
                            }}>
                                Loading stream info...
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                {expandedBlock && (
                    <div style={{ position: 'absolute', left: 0, display: 'flex', alignItems: 'center', paddingLeft: '1rem' }}>
                        <button
                            onClick={handleBackToGrid}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#7d2ee0',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            ← Back
                        </button>
                    </div>
                )}
                <h2>{expandedBlock === 'dynamicCommands' ? 'Dynamic Commands' : expandedBlock === 'commands' ? 'System Commands' : expandedBlock === 'timers' ? 'Timers' : expandedBlock === 'accounts' ? 'Accounts' : 'Dashboard'}</h2>
                {!expandedBlock && (
                    <button
                        className={`edit-btn ${isEditMode ? 'active' : ''}`}
                        onClick={toggleEditMode}
                    >
                        {isEditMode ? 'Save Layout' : 'Edit Layout'}
                    </button>
                )}
            </header>

            <div className="lower" style={{ display: 'flex', height: 'calc(100vh - 6rem)', overflow: 'hidden', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    <main
                        className="block"
                        style={{
                            display: expandedBlock === null ? 'none' : 'flex',
                            visibility: 'visible',
                            pointerEvents: 'auto',
                            flexDirection: 'column',
                            flex: 1,
                            height: '100%',
                            padding: undefined,
                            opacity: expandedBlock === null ? 0 : 1,
                            transform: expandedBlock === null ? 'scale(0.98)' : 'scale(1)',
                            transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                            overflow: 'hidden'
                        }}
                    >
                        {expandedBlock && renderExpandedContent()}
                    </main>

                    <div
                        className={`grid ${isEditMode ? 'edit-mode' : ''}`}
                        style={{
                            display: expandedBlock !== null ? 'none' : 'grid',
                            opacity: expandedBlock !== null ? 0 : 1,
                            transform: expandedBlock !== null ? 'scale(0.98)' : 'scale(1)',
                            transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                            height: '100%',
                            overflowY: 'auto',
                            padding: '1rem' // Kept padding for grid scrolling
                        }}
                    >
                        {layoutOrder.map((id, index) => renderBlockById(id, index))}
                    </div>
                </div>

                <div style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
                    <Chatbox messages={messages} ws={ws.current} />
                </div>
            </div>
        </>
    );
}

export default App;