import { useState, useCallback, useEffect } from 'react';
import { DAppConnector, HederaChainId } from '@hashgraph/hedera-wallet-connect';
import { LedgerId } from '@hashgraph/sdk';
import { getFullUserInfo, saveUserInfo } from '../services/api';
import { Dropp } from '../utils/Dropp';

const useDroppWallet = (config = {}) => {
    const {
        merchantId = process.env.DROPP_MERCHANT_ID,
        environment = process.env.DROPP_ENVIRONMENT || 'SANDBOX',
        ledgerId = LedgerId.TESTNET,
        projectId = '31267a2a9ddb2185483abcf7d3dc4903',
        networks = [HederaChainId.Testnet],
        apiBaseUrl = process.env.DROPP_API_BASE_URL || 'https://unthink-dropp-payment-stage-314035436999.us-central1.run.app'
    } = config;

    const [isConnected, setIsConnected] = useState(false);
    const [walletId, setWalletId] = useState(null);
    const [dAppConnector, setDAppConnector] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const appMetadata = {
                    name: 'VTO App',
                    description: 'Virtual Try-On Application',
                    icons: ['https://walletconnect.com/walletconnect-logo.png'],
                    url: window.location.origin
                };

                const connector = new DAppConnector(
                    appMetadata,
                    ledgerId,
                    projectId,
                    networks
                );

                await connector.init();
                setDAppConnector(connector);
                console.log('Full Connector Object:', connector);
                console.log('Signers:', connector.signers);

                if (connector.signers && connector.signers.length > 0) {
                    const accountId = connector.signers[0].getAccountId().toString();
                    setWalletId(accountId);
                    setIsConnected(true);
                    console.log('Wallet ID:', accountId);
                }
            } catch (error) {
                console.error('Failed to initialize DAppConnector:', error);
            } finally {
                setIsInitializing(false);
            }
        };
        init();
    }, []);

    // Handle email login trigger from new tab
    useEffect(() => {
        const handleNewTabLogin = async () => {
            const loginTrigger = sessionStorage.getItem('dropp_login_trigger');
            const email = sessionStorage.getItem('dropp_login_email');

            if (loginTrigger === 'true' && email) {
                sessionStorage.removeItem('dropp_login_trigger');
                sessionStorage.removeItem('dropp_login_email');

                const dropp = new Dropp({
                    merchantId: merchantId,
                    environment: environment,
                    apiBaseUrl: apiBaseUrl
                });

                const loginOptions = {
                    redirectUrl: window.location.href,
                    purpose: 'login',
                    email: email,
                };

                try {
                    await dropp.login(loginOptions);
                } catch (error) {
                    console.error('Login redirect failed:', error);
                }
            }
        };

        handleNewTabLogin();
    }, [merchantId, environment, apiBaseUrl]);



    const saveWalletToUser = useCallback(async (email, accountId) => {
        try {
            if (!email) {
                console.warn('User email not provided');
                return;
            }

            const userInfo = await getFullUserInfo(email);
            if (!userInfo) {
                console.error('Could not fetch user info');
                return;
            }

            const payload = {
                emailId: userInfo.emailId || email,
                user_name: userInfo.user_name || userInfo.first_name,
                user_id: userInfo.user_id,
                is_influencer: userInfo.is_influencer || false,
                _id: userInfo._id,
                dropp: {
                    testnet: {
                        merchantAccount: accountId,
                        currency: 'USD',
                        hedera_details: {}
                    },
                    mainnet: {}
                }
            };

            await saveUserInfo(payload);
            console.log('Wallet info saved successfully for account:', accountId);
            setStatusMessage('✓ Wallet info saved successfully!');
        } catch (error) {
            console.error('Failed to save wallet info:', error);
            setStatusMessage(`✗ Failed to save wallet info: ${error.message}`);
        }
    }, []);

    const connectWallet = useCallback(async (email) => {
        if (!email) {
            setStatusMessage('⚠️ Please enter an email address first');
            return;
        }

        setIsLoading(true);
        setStatusMessage('Checking user info...');

        try {
            // 1. Check existing user info
            const userInfo = await getFullUserInfo(email);

            // 2. Check if merchantAccount already exists
            const existingAccount = userInfo?.dropp?.testnet?.merchantAccount;

            if (existingAccount) {
                setWalletId(existingAccount);
                setIsConnected(true);
                setStatusMessage(`✓ Wallet already connected: ${existingAccount}`);
                setIsLoading(false);
                return existingAccount;
            }

            // 3. If no existing account, connect wallet
            if (!dAppConnector) {
                throw new Error('DAppConnector not initialized');
            }

            // Open the WalletConnect modal
            const session = await dAppConnector.openModal();

            if (session) {
                const accounts = session.namespaces?.hedera?.accounts || [];
                if (accounts.length > 0) {
                    const fullAccount = accounts[0];
                    const accountId = fullAccount.split(':').pop();

                    setWalletId(accountId);
                    setIsConnected(true);

                    // 4. Save new wallet info
                    setStatusMessage('Saving wallet info...');
                    await saveWalletToUser(email, accountId);

                    setIsLoading(false);
                    return accountId;
                }
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            setStatusMessage(`✗ Error: ${error.message}`);
            setIsLoading(false);
        }
    }, [dAppConnector, saveWalletToUser]);

    const loginWithEmail = useCallback(async (email, openInNewTab = false) => {
        if (!email) {
            setStatusMessage('⚠️ Please enter an email address first');
            return;
        }

        // Save email to localStorage to retrieve it after redirect
        localStorage.setItem('dropp_pending_email', email);

        const dropp = new Dropp({
            merchantId: merchantId,
            environment: environment,
            apiBaseUrl: apiBaseUrl
        });

        const loginOptions = {
            redirectUrl: window.location.href, // Return to this page
            purpose: 'login',
            email: email,
        };

        try {
            if (openInNewTab) {
                // Open login in a new tab - create a blob URL with script to trigger login
                const loginScript = `
                    <script>
                        const dropp = new window.Dropp({
                            merchantId: '${merchantId}',
                            environment: '${environment}',
                            apiBaseUrl: '${apiBaseUrl}'
                        });
                        
                        dropp.login({
                            redirectUrl: window.location.href,
                            purpose: 'login',
                            email: '${email}'
                        }).catch(error => {
                            console.error('Login failed:', error);
                        });
                    </script>
                `;
                
                // Instead, use a proper approach by setting session storage and opening new window
                sessionStorage.setItem('dropp_login_email', email);
                sessionStorage.setItem('dropp_login_trigger', 'true');
                const newWindow = window.open(window.location.href, '_blank');
            } else {
                await dropp.login(loginOptions);
            }
        } catch (error) {
            console.error('Login redirect failed:', error);
            setStatusMessage(`✗ Login failed: ${error.message}`);
        }
    }, [merchantId, environment, apiBaseUrl]);

    const disconnectWallet = useCallback(async () => {
        if (!dAppConnector) return;

        try {
            await dAppConnector.disconnectAll();
            const wcKeys = Object.keys(localStorage).filter(key => key.startsWith('wc@2'));
            wcKeys.forEach(key => localStorage.removeItem(key));

            setWalletId(null);
            setIsConnected(false);
            setStatusMessage('Wallet disconnected');
        } catch (error) {
            console.error('Wallet disconnect failed:', error);
            setWalletId(null);
            setIsConnected(false);
        }
    }, [dAppConnector]);

    // Handle return from Dropp Redirect
    useEffect(() => {
        const checkReturnParams = async () => {
            const params = new URLSearchParams(window.location.search);
            // Check for valid account identifiers from callback
            const returnedAccountId = params.get('account_id') || params.get('merchant_id') || params.get('id');
            const storedEmail = localStorage.getItem('dropp_pending_email');

            if (returnedAccountId && !isConnected) {
                console.log('Found account ID in URL params:', returnedAccountId);
                setWalletId(returnedAccountId);
                setIsConnected(true);

                if (storedEmail) {
                    await saveWalletToUser(storedEmail, returnedAccountId);
                    localStorage.removeItem('dropp_pending_email');
                }

                // Clean URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        };
        checkReturnParams();
    }, [isConnected, saveWalletToUser]);

    return {
        isConnected,
        walletId,
        isInitializing,
        statusMessage,
        isLoading,
        connectWallet,
        disconnectWallet,
        loginWithEmail
    };
};

export default useDroppWallet;
