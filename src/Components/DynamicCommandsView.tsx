import { useState } from 'react';

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

interface DynamicCommandsViewProps {
    dynamicCommands: Record<string, any>;
    ws: WebSocket | null;
}

const ALL_ROLES = ['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'];

const DynamicCommandsView = ({ dynamicCommands, ws }: DynamicCommandsViewProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCommand, setEditingCommand] = useState<string | null>(null);
    const [newCommandName, setNewCommandName] = useState('');
    const [newCommandResponse, setNewCommandResponse] = useState('');
    const [newCommandAliases, setNewCommandAliases] = useState('');
    const [newCommandRoles, setNewCommandRoles] = useState<string[]>(ALL_ROLES);

    const handleCreateCommand = () => {
        if (!newCommandName.trim() || !newCommandResponse.trim()) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            const aliasArray = newCommandAliases
                .split(',')
                .map((a) => a.trim().toLowerCase().replace(/^!/, ''))
                .filter(Boolean);

            ws.send(JSON.stringify({
                action: 'create',
                name: newCommandName.toLowerCase().replace(/^!/, ''),
                response: newCommandResponse,
                aliases: aliasArray.length > 0 ? aliasArray : null,
                roles: newCommandRoles,
                createdBy: 'dashboard',
            }));
            handleCancelEdit();
        }
    };

    const handleCancelEdit = () => {
        setIsModalOpen(false);
        setEditingCommand(null);
        setNewCommandName('');
        setNewCommandResponse('');
        setNewCommandAliases('');
        setNewCommandRoles(ALL_ROLES);
    };

    const handleUpdateCommand = () => {
        if (!newCommandName.trim() || !newCommandResponse.trim()) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            const aliasArray = newCommandAliases
                .split(',')
                .map((a) => a.trim().toLowerCase().replace(/^!/, ''))
                .filter(Boolean);

            ws.send(JSON.stringify({
                action: 'update',
                name: newCommandName.toLowerCase().replace(/^!/, ''),
                response: newCommandResponse,
                aliases: aliasArray.length > 0 ? aliasArray : null,
                roles: newCommandRoles,
            }));
            handleCancelEdit();
        }
    };

    const handleDeleteCommand = (name: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'delete',
                name,
            }));
        }
    };

    const handleEditCommand = (name: string, command: any) => {
        setEditingCommand(name);
        setNewCommandName(name);
        setNewCommandResponse(command.response);
        setNewCommandAliases(command.aliases ? command.aliases.join(', ') : '');
        setNewCommandRoles(command.roles || ALL_ROLES);
        setIsModalOpen(true);
    };

    const getRoleBadges = (roles: string[]) => {
        if (!roles || roles.length === 0) return <span style={{ color: '#ff4757', fontSize: '0.75rem' }}>None</span>;

        const hasAll = ALL_ROLES.every((r) => roles.includes(r));
        if (hasAll) {
            return (
                <span style={{
                    backgroundColor: 'rgba(46, 213, 115, 0.1)',
                    color: '#2ed573',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                }}>
                    Everyone
                </span>
            );
        }

        const hasMods = ['broadcaster', 'lead_moderator', 'moderator'].every((r) => roles.includes(r)) && roles.length === 3;
        if (hasMods) {
            return (
                <span style={{
                    backgroundColor: 'rgba(255, 71, 87, 0.1)',
                    color: '#ff4757',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                }}>
                    Mods & Broadcaster
                </span>
            );
        }

        const labelMap: Record<string, string> = {
            broadcaster: 'Broadcaster',
            lead_moderator: 'Lead Mod',
            moderator: 'Mod',
            subscriber: 'Sub',
            vip: 'VIP',
            viewer: 'Viewer',
        };

        return (
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {ALL_ROLES.filter((r) => roles.includes(r)).map((r) => (
                    <span key={r} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#ccc',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.3rem',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}>
                        {labelMap[r] || r}
                    </span>
                ))}
            </div>
        );
    };

    const filteredCommands = Object.entries(dynamicCommands)
        .filter(([name, command]: [string, any]) =>
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            command.response.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
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
                            transition: 'all 0.2s',
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
                <button
                    onClick={() => {
                        handleCancelEdit();
                        setIsModalOpen(true);
                    }}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#9146ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(145, 70, 255, 0.4)',
                        transition: 'transform 0.2s, background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#7d2ee0';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#9146ff';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span>
                    Add Command
                </button>
            </div>

            {/* Input Overlay Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)',
                }}>
                    <div style={{
                        backgroundColor: '#0f131a',
                        border: '1px solid #1f242e',
                        borderRadius: '1rem',
                        width: '550px',
                        maxWidth: '90%',
                        padding: '2rem',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f242e', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#9146ff' }}>
                                {editingCommand ? `Edit Command: !${editingCommand}` : 'Create New Command'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.25rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Command Name</label>
                            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '0.75rem', color: '#888', fontSize: '0.95rem' }}>!</span>
                                <input
                                    type="text"
                                    placeholder="hello"
                                    value={newCommandName}
                                    onChange={(e) => setNewCommandName(e.target.value)}
                                    disabled={!!editingCommand}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        paddingLeft: '1.5rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #2d3340',
                                        backgroundColor: editingCommand ? '#14171f' : '#1a1f26',
                                        color: editingCommand ? '#888' : 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: editingCommand ? 'not-allowed' : 'text',
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Aliases (comma separated)</label>
                            <input
                                type="text"
                                placeholder="hi, hey, welcome"
                                value={newCommandAliases}
                                onChange={(e) => setNewCommandAliases(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #2d3340',
                                    backgroundColor: '#1a1f26',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>Response message</label>
                            <textarea
                                placeholder="Hello! Welcome to the channel!"
                                value={newCommandResponse}
                                onChange={(e) => setNewCommandResponse(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '100px',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #2d3340',
                                    backgroundColor: '#1a1f26',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold', marginBottom: '0.2rem' }}>Permitted Userlevels (Roles)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                {['broadcaster', 'lead_moderator', 'moderator', 'subscriber', 'vip', 'viewer'].map((role) => {
                                    const isChecked = newCommandRoles.includes(role);
                                    const roleLabels: Record<string, string> = {
                                        broadcaster: 'Broadcaster',
                                        lead_moderator: 'Lead Mod',
                                        moderator: 'Moderator',
                                        subscriber: 'Subscriber',
                                        vip: 'VIP',
                                        viewer: 'Viewer',
                                    };
                                    return (
                                        <label
                                            key={role}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                cursor: 'pointer',
                                                backgroundColor: isChecked ? 'rgba(145, 70, 255, 0.15)' : 'rgba(255,255,255,0.03)',
                                                padding: '0.6rem 0.8rem',
                                                borderRadius: '0.5rem',
                                                border: isChecked ? '1px solid #9146ff' : '1px solid #2d3340',
                                                fontSize: '0.85rem',
                                                color: isChecked ? 'white' : '#aaa',
                                                transition: 'all 0.2s',
                                                userSelect: 'none',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewCommandRoles([...newCommandRoles, role]);
                                                    } else {
                                                        setNewCommandRoles(newCommandRoles.filter((r) => r !== role));
                                                    }
                                                }}
                                                style={{ accentColor: '#9146ff', cursor: 'pointer' }}
                                            />
                                            {roleLabels[role]}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #1f242e', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
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
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (editingCommand) {
                                        handleUpdateCommand();
                                    } else {
                                        handleCreateCommand();
                                    }
                                }}
                                disabled={!newCommandName.trim() || !newCommandResponse.trim()}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: (!newCommandName.trim() || !newCommandResponse.trim()) ? '#2d3340' : '#9146ff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: (!newCommandName.trim() || !newCommandResponse.trim()) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    boxShadow: (!newCommandName.trim() || !newCommandResponse.trim()) ? 'none' : '0 4px 12px rgba(145,70,255,0.3)',
                                }}
                            >
                                {editingCommand ? 'Save Changes' : 'Create Command'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                        gap: '1rem',
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3 }}>🔍</div>
                        <p>{Object.keys(dynamicCommands).length === 0 ? "No commands created yet." : "No commands match your search."}</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1rem',
                        paddingBottom: '2rem',
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
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
                                        borderRadius: '0.4rem',
                                    }}>
                                        !{name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleEditCommand(name, command)}
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
                                                transition: 'all 0.2s',
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
                                                transition: 'all 0.2s',
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
                                    color: '#e0e0e0',
                                    lineHeight: '1.5',
                                    fontSize: '0.95rem',
                                    wordBreak: 'break-word',
                                }}>
                                    {command.response}
                                </div>

                                {command.aliases && command.aliases.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#888', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600' }}>Aliases:</span>
                                        {command.aliases.map((alias: string) => (
                                            <span key={alias} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}>
                                                !{alias}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#888', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600' }}>Userlevels:</span>
                                    {getRoleBadges(command.roles)}
                                </div>

                                <div style={{
                                    borderTop: '1px solid #2d3340',
                                    paddingTop: '0.75rem',
                                    marginTop: 'auto',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: '#888',
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
};

export default DynamicCommandsView;
