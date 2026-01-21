import { useState } from 'react';

interface SystemCommandsViewProps {
    systemCommands: Record<string, any>;
}

const SystemCommandsView = ({ systemCommands }: SystemCommandsViewProps) => {
    const [searchTerm, setSearchTerm] = useState('');

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
};

export default SystemCommandsView;
