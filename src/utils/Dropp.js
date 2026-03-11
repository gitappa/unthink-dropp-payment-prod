import axios from 'axios';

export class Dropp {
    constructor(config) {
        this.merchantId = config.merchantId;
        this.environment = config.environment;
        this.apiBaseUrl = config.apiBaseUrl || 'https://unthink-dropp-payment-prod-314035436999.us-central1.run.app';
    }

    async login(options) {
        console.log('Initiating Dropp Login with options:', options);
        try {
            // Fetch the authorization URL from the backend
            // This assumes the backend is serving the /get-authorize-url endpoint
            const post_data = {
                emailId: options.email,
            };
            const response = await axios.post(`${this.apiBaseUrl}/api/payments/get-authorize-url`, post_data);
            const data = response.data;

            if (data.success && data.authorizeUrl) {
                // Check if we need to append the redirect URL
                // The backend generates a URL for sub-merchant authorization.
                // If the redirectUrl in options is meant to be where Dropp sends the user back,
                // we might need to rely on what's configured in the Dropp portal or the generated URL.

                // For now, we redirect to the URL provided by the SDK/Backend
                window.location.href = data.authorizeUrl;
            } else {
                console.error('Failed to get authorize URL:', data);
                throw new Error(data.error || 'Failed to get authorize URL');
            }
        } catch (error) {
            console.error('Dropp Login Error:', error);
            throw error;
        }
    }
}
