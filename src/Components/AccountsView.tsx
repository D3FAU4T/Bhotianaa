import twitchLogo from '../Assets/glitch_flat_purple.svg';
import spotifyLogo from '../Assets/Spotify_Primary_Logo_RGB_Green.png';
import youtubeLogo from '../Assets/youtube_social_icon_red.png';

interface AccountsViewProps {
    accounts: { broadcaster: { id: string } | null, bot: { id: string } | null } | null;
}

const AccountsView = ({ accounts }: AccountsViewProps) => {
    return (
        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '2rem' }}>Manage Connections</h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Twitch Broadcaster */}
                <div style={{
                    backgroundColor: '#161b22',
                    borderRadius: '1rem',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    border: '1px solid #9146ff',
                    boxShadow: '0 4px 20px rgba(145, 70, 255, 0.1)'
                }}>

                    <div>
                        <img src={twitchLogo} alt="Twitch" style={{ width: '64px', height: '64px' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Twitch Broadcaster</h3>
                        <p style={{ color: '#888' }}>Main channel account for streaming and events.</p>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: accounts?.broadcaster ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        fontSize: '0.9rem',
                        color: accounts?.broadcaster ? '#66bb6a' : '#888'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: accounts?.broadcaster ? '#66bb6a' : '#888'
                        }} />
                        {accounts?.broadcaster ? 'Connected' : 'Not Connected'}
                    </div>
                    <a
                        href="/auth/login/broadcaster"
                        style={{
                            display: 'inline-block',
                            padding: '0.75rem 2rem',
                            backgroundColor: '#9146ff',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {accounts?.broadcaster ? 'Reconnect Broadcaster' : 'Connect Broadcaster'}
                    </a>
                </div>

                {/* Twitch Bot */}
                <div style={{
                    backgroundColor: '#161b22',
                    borderRadius: '1rem',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    border: '1px solid #9146ff',
                    boxShadow: '0 4px 20px rgba(145, 70, 255, 0.1)'
                }}>

                    <div>
                        <img src={twitchLogo} alt="Twitch" style={{ width: '64px', height: '64px' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Twitch Bot</h3>
                        <p style={{ color: '#888' }}>Bot account for chat interactions and moderation.</p>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: accounts?.bot ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        fontSize: '0.9rem',
                        color: accounts?.bot ? '#66bb6a' : '#888'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: accounts?.bot ? '#66bb6a' : '#888'
                        }} />
                        {accounts?.bot ? 'Connected' : 'Not Connected'}
                    </div>
                    <a
                        href="/auth/login/bot"
                        style={{
                            display: 'inline-block',
                            padding: '0.75rem 2rem',
                            backgroundColor: '#9146ff',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {accounts?.bot ? 'Reconnect Bot' : 'Connect Bot'}
                    </a>
                </div>

                {/* Spotify Placeholder */}
                <div style={{
                    backgroundColor: '#161b22',
                    borderRadius: '1rem',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    border: '1px solid #1db954',
                    boxShadow: '0 4px 20px rgba(29, 185, 84, 0.1)',
                    opacity: 0.8
                }}>

                    <div>
                        <img src={spotifyLogo} alt="Spotify" style={{ width: '64px', height: '64px' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Spotify</h3>
                        <p style={{ color: '#888' }}>Song requests and current track display.</p>
                    </div>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: '#ccc',
                        letterSpacing: '1px'
                    }}>
                        COMING SOON
                    </div>
                    <button
                        disabled
                        style={{
                            padding: '0.75rem 2rem',
                            backgroundColor: '#2d3340',
                            color: '#666',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'not-allowed'
                        }}
                    >
                        Connect Spotify
                    </button>
                </div>

                {/* YouTube Placeholder */}
                <div style={{
                    backgroundColor: '#161b22',
                    borderRadius: '1rem',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    border: '1px solid #ff0000',
                    boxShadow: '0 4px 20px rgba(255, 0, 0, 0.1)',
                    opacity: 0.8
                }}>

                    <div>
                        <img src={youtubeLogo} alt="YouTube" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>YouTube</h3>
                        <p style={{ color: '#888' }}>Song requests and video playback.</p>
                    </div>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: '#ccc',
                        letterSpacing: '1px'
                    }}>
                        COMING SOON
                    </div>
                    <button
                        disabled
                        style={{
                            padding: '0.75rem 2rem',
                            backgroundColor: '#2d3340',
                            color: '#666',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            cursor: 'not-allowed'
                        }}
                    >
                        Connect YouTube
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountsView;
