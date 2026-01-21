import { useState } from 'react';
import { formatDate } from '../Core/Functions';

interface DynamicCommandsViewProps {
    dynamicCommands: Record<string, any>;
    ws: WebSocket | null;
}

const DynamicCommandsView = ({ dynamicCommands, ws }: DynamicCommandsViewProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCommand, setEditingCommand] = useState<string | null>(null);
    const [newCommandName, setNewCommandName] = useState('');
    const [newCommandResponse, setNewCommandResponse] = useState('');

    const handleCreateCommand = () => {
        if (!newCommandName.trim() || !newCommandResponse.trim()) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'create',
                name: newCommandName.toLowerCase().replace(/^!/, ''),
                response: newCommandResponse,
                createdBy: 'dashboard'
            }));
            setNewCommandName('');
            setNewCommandResponse('');
        }
    };

    const handleCancelEdit = () => {
        setEditingCommand(null);
        setNewCommandName('');
        setNewCommandResponse('');
    };

    const handleUpdateCommand = () => {
        if (!newCommandName.trim() || !newCommandResponse.trim()) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'update',
                name: newCommandName.toLowerCase().replace(/^!/, ''),
                response: newCommandResponse,
            }));
            handleCancelEdit();
        }
    };

    const handleDeleteCommand = (name: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
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
};

export default DynamicCommandsView;
