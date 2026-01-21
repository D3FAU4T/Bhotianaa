import { useState } from 'react';

interface TimersViewProps {
    timers: Record<string, any>;
    ws: WebSocket | null;
}

const TimersView = ({ timers, ws }: TimersViewProps) => {
    const [editingTimer, setEditingTimer] = useState<string | null>(null);
    const [newTimerName, setNewTimerName] = useState('');
    const [newTimerMessage, setNewTimerMessage] = useState('');
    const [newTimerInterval, setNewTimerInterval] = useState('');

    const handleCreateTimer = () => {
        const interval = parseInt(newTimerInterval);
        if (!newTimerName.trim() || !newTimerMessage.trim() || isNaN(interval) || interval < 1) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
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
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'deleteTimer',
                name
            }));
        }
    };

    const handleToggleTimer = (name: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
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

    const handleCancelEditTimer = () => {
        setEditingTimer(null);
        setNewTimerName('');
        setNewTimerMessage('');
        setNewTimerInterval('');
    };

    const handleUpdateTimer = () => {
        const interval = parseInt(newTimerInterval);
        if (!editingTimer || !newTimerMessage.trim() || isNaN(interval) || interval < 1) return;

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'updateTimer',
                name: editingTimer,
                message: newTimerMessage.trim(),
                interval: Math.max(1, Math.floor(interval))
            }));
            handleCancelEditTimer();
        }
    };

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
};

export default TimersView;
