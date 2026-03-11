import React, { useState } from 'react';
import useDroppWallet from '../hooks/useDroppWallet';

const SampleUsage = () => {
    const [email, setEmail] = useState('');

    const {
        isConnected,
        walletId,
        statusMessage,
        isLoading,
        connectWallet,      // QR Code / WalletConnect
        loginWithEmail,     // Direct Login / Redirect
        disconnectWallet
    } = useDroppWallet({
        merchantId: import.meta.env.VITE_DROPP_MERCHANT_ID || '0.0.9763153',
        environment: import.meta.env.VITE_DROPP_ENVIRONMENT || 'PROD',
        //apiBaseUrl: window.location.origin.includes('localhost') ? 'http://localhost:8080' : ''
        apiBaseUrl: 'https://unthink-dropp-payment-prod-314035436999.us-central1.run.app'
    });

    const handleQrConnect = async () => {
        if (!email) {
            alert('Please enter an email first');
            return;
        }
        await connectWallet(email);
    };

    const handleEmailLogin = async () => {
        if (!email) {
            alert('Please enter an email first');
            return;
        }
        await loginWithEmail(email, true); // true = open in new tab
    };

    return (
        <div style={{ padding: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div className="glass-card">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                        Dropp Wallet Plugin Demo
                    </h2>
                </div>

                {/* Status Message Area */}
                {statusMessage && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px',
                        backgroundColor: statusMessage.includes('✗') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: statusMessage.includes('✗') ? '#ef4444' : '#10b981',
                        textAlign: 'center',
                        border: `1px solid ${statusMessage.includes('✗') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                        {statusMessage}
                    </div>
                )}

                {!isConnected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <label className="label-text" style={{ color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                                Enter your email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@example.com"
                                className="text-input"
                                style={{ padding: '12px', height: 'auto', width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleQrConnect}
                                disabled={isLoading}
                                className="gradient-button"
                            >
                                {isLoading ? 'Processing...' : 'Connect Wallet'}
                            </button>

                            <button
                                onClick={handleEmailLogin}
                                disabled={isLoading}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                            >
                                Login with Dropp Email
                            </button>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                                <strong>Status:</strong> {statusMessage || 'Idle'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡</div>
                        <h3 style={{ fontSize: '20px', marginBottom: '12px', color: '#10b981' }}>Success!</h3>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '24px' }}>
                            Your wallet is linked: <br />
                            <code style={{
                                display: 'block',
                                marginTop: '12px',
                                background: 'rgba(0,0,0,0.3)',
                                padding: '12px',
                                borderRadius: '8px',
                                color: '#a855f7',
                                fontWeight: '600'
                            }}>
                                {walletId}
                            </code>
                        </p>

                        <button
                            onClick={disconnectWallet}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '12px 24px',
                                borderRadius: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            Disconnect Wallet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SampleUsage;
