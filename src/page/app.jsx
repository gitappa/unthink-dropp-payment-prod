import React, { useState, useEffect } from 'react';
import WalletConnectButton from './WalletConnectButton';

/**
 * Test Application for WalletConnect Handler
 * 
 * This app demonstrates:
 * 1. Wallet connection with account ID retrieval
 * 2. Calling saveUserInfo REST API on successful connection
 * 3. Display of connected wallet information
 * 4. Error handling and connection status
 */

const TestApp = () => {
    const [userEmail, setUserEmail] = useState('');
    const [connectedAccountId, setConnectedAccountId] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Handle wallet connection callback
    const handleWalletConnect = (accountId) => {
        console.log('✓ Wallet connected with account ID:', accountId);
        setConnectedAccountId(accountId);
        setConnectionStatus('connected');
        setStatusMessage(`Successfully connected wallet: ${accountId}`);
    };

    // Handle email input change
    const handleEmailChange = (e) => {
        setUserEmail(e.target.value);
    };

    // Reset connection
    const handleReset = () => {
        setConnectedAccountId(null);
        setConnectionStatus('disconnected');
        setStatusMessage('');
        setUserEmail('');
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>🔗 WalletConnect Test Application</h1>
                <p style={styles.subtitle}>Test wallet connection and saveUserInfo API</p>
            </div>

            <div style={styles.card}>
                <h2>Step 1: Enter Email</h2>
                <input
                    type="email"
                    placeholder="Enter your email address"
                    value={userEmail}
                    onChange={handleEmailChange}
                    style={styles.input}
                />
            </div>

            <div style={styles.card}>
                <h2>Step 2: Connect Wallet</h2>
                <div style={styles.buttonContainer}>
                    <WalletConnectButton
                        onWalletConnect={handleWalletConnect}
                        userEmail={userEmail}
                    />
                    <p style={styles.hint}>Click the wallet button to connect</p>
                </div>
            </div>

            {connectedAccountId && (
                <div style={styles.card}>
                    <h2>Step 3: Verify Connection</h2>
                    <div style={styles.infoBox}>
                        <p><strong>Email:</strong> {userEmail}</p>
                        <p><strong>Connected Account ID:</strong> {connectedAccountId}</p>
                        <p><strong>Status:</strong> <span style={styles.successBadge}>{connectionStatus}</span></p>
                    </div>
                    <div style={styles.buttonContainer}>
                        <button
                            onClick={handleReset}
                            style={styles.buttonSecondary}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}



            {statusMessage && (
                <div style={{
                    ...styles.card,
                    backgroundColor: statusMessage.includes('✓') ? '#d4edda' :
                        statusMessage.includes('✗') ? '#f8d7da' : '#fff3cd',
                    borderLeft: `4px solid ${statusMessage.includes('✓') ? '#28a745' :
                        statusMessage.includes('✗') ? '#dc3545' : '#ffc107'}`
                }}>
                    <p style={styles.statusMessage}>{statusMessage}</p>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
        color: '#333'
    },
    subtitle: {
        color: '#666',
        marginTop: '5px'
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
    },
    input: {
        width: '100%',
        padding: '10px',
        fontSize: '14px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        marginTop: '10px'
    },
    buttonContainer: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        marginTop: '15px'
    },
    button: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'background-color 0.3s'
    },
    buttonSecondary: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
    },
    hint: {
        fontSize: '12px',
        color: '#666',
        marginTop: '5px'
    },
    infoBox: {
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '4px',
        border: '1px solid #dee2e6',
        marginTop: '10px'
    },
    successBadge: {
        backgroundColor: '#28a745',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '3px',
        fontSize: '12px'
    },
    statusMessage: {
        margin: 0,
        fontSize: '14px'
    },
    flowList: {
        lineHeight: '1.8',
        color: '#333'
    },
    nestedList: {
        marginTop: '5px',
        marginBottom: '5px',
        color: '#666'
    },
    logList: {
        color: '#666',
        lineHeight: '1.6'
    },
    note: {
        fontSize: '12px',
        color: '#999',
        fontStyle: 'italic',
        marginTop: '10px'
    }
};

export default TestApp;
