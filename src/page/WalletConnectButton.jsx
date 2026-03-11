import React from 'react';
import { Wallet } from 'lucide-react';
import useDroppWallet from '../hooks/useDroppWallet';

const WalletConnectButton = ({ onWalletConnect, userEmail }) => {
    const {
        isConnected,
        walletId,
        isInitializing,
        connectWallet,
        disconnectWallet
    } = useDroppWallet();

    const handleClick = async () => {
        if (isConnected) {
            await disconnectWallet();
        } else {
            const accountId = await connectWallet(userEmail);
            if (accountId && onWalletConnect) {
                onWalletConnect(accountId);
            }
        }
    };

    // Notify parent if already connected on mount/update
    React.useEffect(() => {
        if (isConnected && walletId && onWalletConnect) {
            onWalletConnect(walletId);
        }
    }, [isConnected, walletId, onWalletConnect]);

    return (
        <button
            aria-label={isConnected ? `Connected: ${walletId}` : 'Connect Wallet'}
            onClick={handleClick}
            disabled={isInitializing}
            className="fixed top-4 right-16 z-50 rounded-full bg-white shadow-lg border p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isConnected ? `Connected: ${walletId} (Click to disconnect)` : 'Connect Wallet'}
        >
            <div className="relative">
                <Wallet className="w-6 h-6 text-gray-800" />
                {isConnected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
            </div>
        </button>
    );
};

export default WalletConnectButton;
