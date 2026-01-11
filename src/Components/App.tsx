import Chatbox from "./Chatbox";
import Block from "./Block";
import CommandBlock from "./CommandBlock";
import { useEffect, useRef, useState } from "react";
import type { CommandContext } from "../Typings/Bhotianaa";

const App = () => {
    const [messages, setMessages] = useState<Omit<CommandContext, 'args'>[]>([]);
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
    const [isClosingStream, setIsClosingStream] = useState(false);
    const [dynamicCommands, setDynamicCommands] = useState<Record<string, any>>({});
    const [newCommandName, setNewCommandName] = useState('');
    const [newCommandResponse, setNewCommandResponse] = useState('');
    const [editingCommand, setEditingCommand] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [systemCommands, setSystemCommands] = useState<Record<string, any>>({});
    const [timers, setTimers] = useState<Record<string, any>>({});
    const [newTimerName, setNewTimerName] = useState('');
    const [newTimerMessage, setNewTimerMessage] = useState('');
    const [newTimerInterval, setNewTimerInterval] = useState('');
    const [editingTimer, setEditingTimer] = useState<string | null>(null);
    const [streamInfo, setStreamInfo] = useState<{ title: string, gameName: string, gameArt: string, channelName: string, isLive?: boolean } | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const commandsWs = useRef<WebSocket | null>(null);
    const streamIframeRef = useRef<HTMLIFrameElement | null>(null);
    const gridBlockRef = useRef<HTMLDivElement | null>(null);
    const mainBlockRef = useRef<HTMLElement | null>(null);
    const lastGridRectRef = useRef<DOMRect | null>(null);

    // Helper function to format dates consistently
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const handleBlockClick = (blockType: string) => {
        setExpandedBlock(blockType);
    };

    const handleBackToGrid = () => {
        if (expandedBlock === 'stream') {
            setIsClosingStream(true);
            return;
        }

        setExpandedBlock(null);
        setEditingCommand(null);
        setNewCommandName('');
        setNewCommandResponse('');
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

    const handleCreateCommand = () => {
        if (!newCommandName.trim() || !newCommandResponse.trim()) return;

        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'create',
                name: newCommandName.toLowerCase().replace(/^!/, ''),
                response: newCommandResponse,
                createdBy: 'dashboard'
            }));
            setNewCommandName('');
            setNewCommandResponse('');
        }
    };

    const handleUpdateCommand = () => {
        if (!newCommandName.trim() || !newCommandResponse.trim()) return;

        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'update',
                name: newCommandName.toLowerCase().replace(/^!/, ''),
                response: newCommandResponse,
            }));
            handleCancelEdit();
        }
    };

    const handleDeleteCommand = (name: string) => {
        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'delete',
                name
            }));
        }
    };

    const handleEditCommand = (name: string, response: string) => {
        setEditingCommand(name);
        setNewCommandName(name);
        setNewCommandResponse(response);
    };

    const handleCancelEdit = () => {
        setEditingCommand(null);
        setNewCommandName('');
        setNewCommandResponse('');
    };

    const handleCreateTimer = () => {
        const interval = parseInt(newTimerInterval);
        if (!newTimerName.trim() || !newTimerMessage.trim() || isNaN(interval) || interval < 1) return;

        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'createTimer',
                name: newTimerName.trim(),
                message: newTimerMessage.trim(),
                interval: Math.max(1, Math.floor(interval))
            }));
            setNewTimerName('');
            setNewTimerMessage('');
            setNewTimerInterval('');
        }
    };

    const handleDeleteTimer = (name: string) => {
        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'deleteTimer',
                name
            }));
        }
    };

    const handleToggleTimer = (name: string) => {
        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'toggleTimer',
                name
            }));
        }
    };

    const handleEditTimer = (name: string, message: string, interval: number) => {
        setEditingTimer(name);
        setNewTimerName(name);
        setNewTimerMessage(message);
        setNewTimerInterval(interval.toString());
    };

    const handleUpdateTimer = () => {
        const interval = parseInt(newTimerInterval);
        if (!editingTimer || !newTimerMessage.trim() || isNaN(interval) || interval < 1) return;

        if (commandsWs.current && commandsWs.current.readyState === WebSocket.OPEN) {
            commandsWs.current.send(JSON.stringify({
                action: 'updateTimer',
                name: editingTimer,
                message: newTimerMessage.trim(),
                interval: Math.max(1, Math.floor(interval))
            }));
            handleCancelEditTimer();
        }
    };

    const handleCancelEditTimer = () => {
        setEditingTimer(null);
        setNewTimerName('');
        setNewTimerMessage('');
        setNewTimerInterval('');
    };

    const renderExpandedContent = () => {
        switch (expandedBlock) {
            case 'dynamicCommands':
                const filteredCommands = Object.entries(dynamicCommands)
                    .filter(([name, command]: [string, any]) =>
                        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        command.response.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                return (
                    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ position: 'relative', width: '300px' }}>
                                <input
                                    type="text"
                                    placeholder="Search commands..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        paddingLeft: '2.5rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #3a3f47',
                                        backgroundColor: '#0f131a',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#7d2ee0'}
                                    onBlur={(e) => e.target.style.borderColor = '#3a3f47'}
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }}
                                >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                        </div>

                        {/* Create/Edit Command Bar */}
                        <div style={{
                            backgroundColor: '#0f131a',
                            padding: '1rem',
                            borderRadius: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            gap: '1rem',
                            alignItems: 'center',
                            border: editingCommand ? '1px solid #7d2ee0' : '1px solid #1f242e',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'border-color 0.3s'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: editingCommand ? '#7d2ee0' : '#9146ff', fontWeight: 'bold' }}>
                                <span style={{ fontSize: '1.2rem', paddingRight: '0.5rem' }}>
                                    {editingCommand ? '✎' : '+'}
                                </span>
                            </div>
                            <input
                                type="text"
                                placeholder="Command name"
                                value={newCommandName}
                                onChange={(e) => setNewCommandName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (editingCommand ? handleUpdateCommand() : handleCreateCommand())}
                                disabled={!!editingCommand}
                                style={{
                                    flex: '0 0 200px',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #2d3340',
                                    backgroundColor: editingCommand ? '#14171f' : '#1a1f26',
                                    color: editingCommand ? '#888' : 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    cursor: editingCommand ? 'not-allowed' : 'text'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Response message..."
                                value={newCommandResponse}
                                onChange={(e) => setNewCommandResponse(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (editingCommand ? handleUpdateCommand() : handleCreateCommand())}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #2d3340',
                                    backgroundColor: '#1a1f26',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                            {editingCommand && (
                                <button
                                    onClick={handleCancelEdit}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: 'transparent',
                                        color: '#ccc',
                                        border: '1px solid #3a3f47',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={editingCommand ? handleUpdateCommand : handleCreateCommand}
                                disabled={!newCommandName.trim() || !newCommandResponse.trim()}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: (!newCommandName.trim() || !newCommandResponse.trim()) ? '#2d3340' : (editingCommand ? '#7d2ee0' : '#9146ff'),
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: (!newCommandName.trim() || !newCommandResponse.trim()) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {editingCommand ? 'Save Changes' : 'Add Command'}
                            </button>
                        </div>

                        {/* Commands Grid */}
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                            {filteredCommands.length === 0 ? (
                                <div style={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#888',
                                    gap: '1rem'
                                }}>
                                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>🔍</div>
                                    <p>{Object.keys(dynamicCommands).length === 0 ? "No commands created yet." : "No commands match your search."}</p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: '1rem',
                                    paddingBottom: '2rem'
                                }}>
                                    {filteredCommands.map(([name, command]) => (
                                        <div
                                            key={name}
                                            className="command-card"
                                            style={{
                                                backgroundColor: '#161b22',
                                                borderRadius: '0.75rem',
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                border: '1px solid transparent',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.borderColor = '#7d2ee0';
                                                e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{
                                                    fontSize: '1.2rem',
                                                    fontWeight: '700',
                                                    color: '#9146ff',
                                                    backgroundColor: 'rgba(145, 70, 255, 0.1)',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '0.4rem'
                                                }}>
                                                    !{name}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleEditCommand(name, command.response)}
                                                        title="Edit Command"
                                                        style={{
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            color: '#666',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '0.4rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(125, 46, 224, 0.1)';
                                                            e.currentTarget.style.color = '#7d2ee0';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = '#666';
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 20h9"></path>
                                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCommand(name)}
                                                        title="Delete Command"
                                                        style={{
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            color: '#666',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '0.4rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.1)';
                                                            e.currentTarget.style.color = '#d32f2f';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = '#666';
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{
                                                flex: 1,
                                                color: '#e0e0e0',
                                                lineHeight: '1.5',
                                                fontSize: '0.95rem',
                                                wordBreak: 'break-word',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {command.response}
                                            </div>

                                            <div style={{
                                                borderTop: '1px solid #2d3340',
                                                paddingTop: '0.75rem',
                                                marginTop: 'auto',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.75rem',
                                                color: '#888'
                                            }}>
                                                <span>{command.createdBy}</span>
                                                <span>{formatDate(command.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'timers':
                return (
                    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Create/Edit Timer Form */}
                        <div style={{
                            backgroundColor: '#0f131a',
                            padding: '1.5rem',
                            borderRadius: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{ marginBottom: '1rem' }}>{editingTimer ? 'Edit Timer' : 'Create New Timer'}</h3>
                            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Timer Name"
                                        value={newTimerName}
                                        onChange={(e) => setNewTimerName(e.target.value)}
                                        disabled={!!editingTimer}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: 'none',
                                            backgroundColor: editingTimer ? '#2d3340' : '#1a1f26',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            cursor: editingTimer ? 'not-allowed' : 'text'
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Minutes (1-1440)"
                                        min="1"
                                        max="1440"
                                        step="1"
                                        value={newTimerInterval}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // Only allow integers
                                            if (val === '' || /^\d+$/.test(val)) {
                                                setNewTimerInterval(val);
                                            }
                                        }}
                                        style={{
                                            width: '180px',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: parseInt(newTimerInterval) < 1 && newTimerInterval !== '' ? '1px solid #ef5350' : 'none',
                                            backgroundColor: '#1a1f26',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#888', margin: '-0.5rem 0 0.5rem 0' }}>
                                    ⏱️ Minimum interval is 1 minute. Maximum is 1440 minutes (24 hours).
                                </p>
                                <input
                                    type="text"
                                    placeholder="Message to send"
                                    value={newTimerMessage}
                                    onChange={(e) => setNewTimerMessage(e.target.value)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        backgroundColor: '#1a1f26',
                                        color: 'white',
                                        fontSize: '1rem',
                                        outline: 'none'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={editingTimer ? handleUpdateTimer : handleCreateTimer}
                                        disabled={!newTimerName.trim() || !newTimerMessage.trim() || !newTimerInterval.trim() || parseInt(newTimerInterval) < 1}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem 1.5rem',
                                            backgroundColor: (!newTimerName.trim() || !newTimerMessage.trim() || !newTimerInterval.trim() || parseInt(newTimerInterval) < 1) ? '#3a3f47' : '#7d2ee0',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            cursor: (!newTimerName.trim() || !newTimerMessage.trim() || !newTimerInterval.trim() || parseInt(newTimerInterval) < 1) ? 'not-allowed' : 'pointer',
                                            fontSize: '1rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {editingTimer ? 'Update Timer' : 'Create Timer'}
                                    </button>
                                    {editingTimer && (
                                        <button
                                            onClick={handleCancelEditTimer}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                backgroundColor: '#3a3f47',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Timers Grid */}
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                            {Object.entries(timers).length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem',
                                    color: '#888',
                                    backgroundColor: '#0f131a',
                                    borderRadius: '1rem'
                                }}>
                                    No timers yet. Create your first timer above!
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1rem',
                                    paddingBottom: '2rem'
                                }}>
                                    {Object.entries(timers).map(([name, timer]: [string, any]) => (
                                        <div
                                            key={name}
                                            style={{
                                                backgroundColor: '#161b22',
                                                borderRadius: '0.75rem',
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                border: '1px solid transparent',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 'bold', color: '#9146ff', fontSize: '1.1rem' }}>{timer.name}</div>
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    backgroundColor: '#2d3340',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '0.3rem',
                                                    color: '#a0a0a0'
                                                }}>
                                                    Every {timer.interval} min
                                                </div>
                                            </div>

                                            <div style={{
                                                flex: 1,
                                                color: '#e0e0e0',
                                                lineHeight: '1.4',
                                                fontSize: '0.95rem'
                                            }}>
                                                {timer.message}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderTop: '1px solid #2d3340',
                                                paddingTop: '0.75rem',
                                                marginTop: '0.5rem'
                                            }}>
                                                <button
                                                    onClick={() => handleToggleTimer(name)}
                                                    style={{
                                                        padding: '0.4rem 0.8rem',
                                                        backgroundColor: timer.enabled ? 'rgba(46, 125, 50, 0.2)' : 'rgba(198, 40, 40, 0.2)',
                                                        color: timer.enabled ? '#66bb6a' : '#ef5350',
                                                        border: '1px solid',
                                                        borderColor: timer.enabled ? '#2e7d32' : '#c62828',
                                                        borderRadius: '0.3rem',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    {timer.enabled ? 'ENABLED' : 'DISABLED'}
                                                </button>

                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => handleEditTimer(name, timer.message, timer.interval)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: '#3a3f47',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '0.3rem',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTimer(name)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: 'rgba(239, 83, 80, 0.1)',
                                                            color: '#ef5350',
                                                            border: 'none',
                                                            borderRadius: '0.3rem',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'commands':
                const filteredSystemCommands = Object.entries(systemCommands)
                    .filter(([name, command]: [string, any]) =>
                        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        command.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort(([a], [b]) => a.localeCompare(b));

                return (
                    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ position: 'relative', width: '300px' }}>
                                <input
                                    type="text"
                                    placeholder="Search commands..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        paddingLeft: '2.5rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #3a3f47',
                                        backgroundColor: '#0f131a',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#7d2ee0'}
                                    onBlur={(e) => e.target.style.borderColor = '#3a3f47'}
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }}
                                >
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                        </div>

                        {/* Commands Grid */}
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                            {filteredSystemCommands.length === 0 ? (
                                <div style={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: '#888',
                                    gap: '1rem'
                                }}>
                                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>🔍</div>
                                    <p>{Object.keys(systemCommands).length === 0 ? "Loading commands..." : "No commands match your search."}</p>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1rem',
                                    paddingBottom: '2rem'
                                }}>
                                    {filteredSystemCommands.map(([name, command]) => (
                                        <div
                                            key={name}
                                            style={{
                                                backgroundColor: '#161b22',
                                                borderRadius: '0.75rem',
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                border: '1px solid transparent',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.borderColor = '#7d2ee0';
                                                e.currentTarget.style.boxShadow = '0 8px 12px rgba(0,0,0,0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.borderColor = 'transparent';
                                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                <div style={{
                                                    fontSize: '1.2rem',
                                                    fontWeight: '700',
                                                    color: '#9146ff',
                                                    backgroundColor: 'rgba(145, 70, 255, 0.1)',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '0.4rem',
                                                    flex: 1
                                                }}>
                                                    !{name}
                                                </div>
                                                {command.moderatorOnly && (
                                                    <div style={{
                                                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                                        color: '#ffc107',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '0.3rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        MOD ONLY
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{
                                                flex: 1,
                                                color: '#e0e0e0',
                                                lineHeight: '1.5',
                                                fontSize: '0.95rem',
                                                wordBreak: 'break-word'
                                            }}>
                                                {command.description}
                                            </div>

                                            {command.aliases && command.aliases.length > 0 && (
                                                <div style={{
                                                    borderTop: '1px solid #2d3340',
                                                    paddingTop: '0.75rem',
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                    flexWrap: 'wrap',
                                                    alignItems: 'center'
                                                }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600' }}>Aliases:</span>
                                                    {command.aliases.map((alias: string) => (
                                                        <span
                                                            key={alias}
                                                            style={{
                                                                backgroundColor: 'rgba(125, 46, 224, 0.1)',
                                                                color: '#9d7de0',
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '0.3rem',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '500'
                                                            }}
                                                        >
                                                            !{alias}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'stream':
                return null; // Stream content is rendered by the fixed iframe
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

    useEffect(() => {
        ws.current = new WebSocket(`ws://${window.location.host}/socket/chat`);

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
                // Keep only the last 100 messages
                if (newMessages.length > 100) {
                    return newMessages.slice(-100);
                }
                return newMessages;
            });
        };

        return () => ws.current?.close();

    }, []);

    // Setup commands websocket for real-time updates
    useEffect(() => {
        commandsWs.current = new WebSocket(`ws://${window.location.host}/socket/commands`);

        commandsWs.current.onopen = () => {
            // Request all commands when connection opens
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
            if (data.type === 'allCommands') {
                // Update commands state with the full list
                setDynamicCommands(data.commands);
            } else if (data.type === 'systemCommands') {
                setSystemCommands(data.commands);
            } else if (data.type === 'allTimers') {
                setTimers(data.timers);
            } else if (data.type === 'streamInfo') {
                setStreamInfo(data.data);
            } else if (data.error) {
                console.error('Commands error:', data.error);
            }
        };

        return () => commandsWs.current?.close();
    }, []);

    // Trigger autoplay on mount
    useEffect(() => {
        // Small delay to ensure iframe is loaded
        const timer = setTimeout(() => {
            if (streamIframeRef.current) {
                // Click the iframe to trigger autoplay
                const clickEvent = new MouseEvent('click', { bubbles: true });
                streamIframeRef.current.dispatchEvent(clickEvent);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Update iframe position to match grid block or main block
    useEffect(() => {
        const updateIframePosition = () => {
            if (!streamIframeRef.current) return;

            if (expandedBlock === null && gridBlockRef.current) {
                // Grid view - position over the grid block
                const rect = gridBlockRef.current.getBoundingClientRect();
                lastGridRectRef.current = rect;
                streamIframeRef.current.style.setProperty('--grid-iframe-top', `${rect.top}px`);
                streamIframeRef.current.style.setProperty('--grid-iframe-left', `${rect.left}px`);
                streamIframeRef.current.style.width = `${rect.width}px`;
                streamIframeRef.current.style.height = `${rect.height}px`;
            } else if (expandedBlock === 'stream' && mainBlockRef.current) {
                // Expanded view - match the main block exactly
                const rect = mainBlockRef.current.getBoundingClientRect();
                streamIframeRef.current.style.setProperty('--expanded-iframe-top', `${rect.top}px`);
                streamIframeRef.current.style.setProperty('--expanded-iframe-left', `${rect.left}px`);
                streamIframeRef.current.style.setProperty('--expanded-iframe-width', `${rect.width}px`);
                streamIframeRef.current.style.setProperty('--expanded-iframe-height', `${rect.height}px`);
            }
        };

        updateIframePosition();
        window.addEventListener('resize', updateIframePosition);

        return () => window.removeEventListener('resize', updateIframePosition);
    }, [expandedBlock]);

    // Animate stream closing (zoom out) before switching back to dashboard.
    useEffect(() => {
        if (!isClosingStream) return;

        const iframe = streamIframeRef.current;
        const rect = lastGridRectRef.current;

        if (!iframe || !rect) {
            setIsClosingStream(false);
            setExpandedBlock(null);
            return;
        }

        // Use requestAnimationFrame to ensure the DOM has updated before we change CSS vars
        requestAnimationFrame(() => {
            // While still in expanded mode, point the "expanded" CSS vars at the grid rect,
            // so the iframe transitions back smoothly.
            iframe.style.setProperty('--expanded-iframe-top', `${rect.top}px`);
            iframe.style.setProperty('--expanded-iframe-left', `${rect.left}px`);
            iframe.style.setProperty('--expanded-iframe-width', `${rect.width}px`);
            iframe.style.setProperty('--expanded-iframe-height', `${rect.height}px`);
        });

        const timeoutId = window.setTimeout(() => {
            setIsClosingStream(false);
            setExpandedBlock(null);
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [isClosingStream]);

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
                <h2>{expandedBlock === 'stream' ? 'Twitch' : expandedBlock === 'dynamicCommands' ? 'Dynamic Commands' : expandedBlock === 'commands' ? 'System Commands' : expandedBlock === 'timers' ? 'Timers' : 'Dashboard'}</h2>
            </header>

            <div className="lower">
                <main
                    ref={mainBlockRef}
                    className="block"
                    style={{
                        display: expandedBlock === null ? 'none' : 'flex',
                        visibility: expandedBlock === 'stream' ? 'hidden' : 'visible',
                        pointerEvents: expandedBlock === 'stream' ? 'none' : 'auto',
                        flexDirection: 'column',
                        flex: 1,
                        height: expandedBlock !== null ? 'calc(100vh - 6rem)' : undefined,
                        padding: expandedBlock === 'stream' ? 0 : undefined,
                        opacity: expandedBlock === null || expandedBlock === 'stream' ? 0 : 1,
                        transform: expandedBlock === null ? 'scale(0.98)' : (expandedBlock === 'stream' ? 'none' : 'scale(1)'),
                        transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'hidden'
                    }}
                >
                    {expandedBlock && expandedBlock !== 'stream' && renderExpandedContent()}
                </main>
                <div
                    className="grid"
                    style={{
                        display: (expandedBlock !== null && !isClosingStream) ? 'none' : 'grid',
                        opacity: (expandedBlock !== null && !isClosingStream) ? 0 : 1,
                        transform: (expandedBlock !== null && !isClosingStream) ? 'scale(0.98)' : 'scale(1)',
                        transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    <Block
                        onClick={() => handleBlockClick('stream')}
                        style={{
                            padding: 0,
                            gridRow: "span 2",
                            gridColumn: "span 2",
                            position: "relative"
                        }}
                        hoverScale={1.02}
                    >
                        <div
                            ref={gridBlockRef}
                            style={{ width: "100%", height: "100%", position: "relative" }}
                        >
                            {/* Placeholder for iframe when in grid - actual iframe rendered separately */}
                        </div>
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "transparent",
                                cursor: "pointer",
                                zIndex: 2
                            }}
                            onClick={() => handleBlockClick('stream')}
                        />
                    </Block>

                    <CommandBlock
                        count={Object.keys(dynamicCommands).length}
                        label="Dynamic Commands"
                        onClick={() => handleBlockClick('dynamicCommands')}
                    />
                    <CommandBlock
                        count={Object.keys(systemCommands).length}
                        label="System Commands"
                        onClick={() => handleBlockClick('commands')}
                    />
                    <CommandBlock
                        count={Object.keys(timers).length}
                        label="Timers"
                        onClick={() => handleBlockClick('timers')}
                    />

                    {/* <Block onClick={() => handleBlockClick('other')}>
                        <h1>Hi</h1>
                    </Block> */}
                    <div
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
                            cursor: 'default',
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
                                        {streamInfo.isLive ? 'LIVE NOW' : 'OFFLINE'}
                                    </div>
                                    <h2 style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        marginBottom: '1rem',
                                        lineHeight: '1.3',
                                        color: '#fff',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        {streamInfo.title}
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
                                    <div>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            color: '#9146ff',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            fontWeight: '600',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {streamInfo.isLive ? 'Playing' : 'Last seen playing'}
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
                </div>
                <div>
                    <Chatbox messages={messages} ws={ws.current} />
                </div>

                {/* Single stream iframe that repositions based on state */}
                <iframe
                    ref={streamIframeRef}
                    style={{
                        position: 'fixed',
                        border: "none",
                        borderRadius: "1rem",
                        pointerEvents: expandedBlock === 'stream' && !isClosingStream ? 'auto' : 'none',
                        width: expandedBlock === 'stream'
                            ? 'var(--expanded-iframe-width, auto)'
                            : 'auto',
                        height: expandedBlock === 'stream'
                            ? 'var(--expanded-iframe-height, auto)'
                            : 'auto',
                        top: expandedBlock === 'stream'
                            ? 'var(--expanded-iframe-top, 0)'
                            : 'var(--grid-iframe-top, 0)',
                        left: expandedBlock === 'stream'
                            ? 'var(--expanded-iframe-left, 0)'
                            : 'var(--grid-iframe-left, 0)',
                        zIndex: expandedBlock === 'stream' ? 999 : 1,
                        transition: 'all 0.3s ease-in-out',
                        display: expandedBlock === null || expandedBlock === 'stream' ? 'block' : 'none',
                        overflow: 'hidden'
                    }}
                    src={streamInfo ? `https://player.twitch.tv/?channel=${streamInfo.channelName}&parent=localhost&muted=false&autoplay=true` : ''}
                    allow="autoplay; fullscreen"
                />
            </div >

        </>
    );
}

export default App;