# Dropp Wallet Plugin - Implementation Steps

## Step 1: Copy Plugin Files
Copy these files to your React app's `src/libs/` directory:
- `dropp-wallet-plugin.es.js` (or `.umd.js` for older bundlers)
- `dropp-wallet-plugin.css`

## Step 2: Install Dependencies
```bash
npm install @hashgraph/hedera-wallet-connect@^2.0.4 @hashgraph/sdk@^2.79.0
```

## Step 3: Import the Hook
```jsx
import { useDroppWallet } from '../libs/dropp-wallet-plugin.es.js';
import '../libs/dropp-wallet-plugin.css';
```

## Step 4: Initialize Hook with Config
```jsx
const { 
  isConnected, 
  walletId, 
  statusMessage, 
  isLoading,
  connectWallet, 
  loginWithEmail,
  disconnectWallet 
} = useDroppWallet({
  merchantId: 'your-merchant-id',
  environment: 'SANDBOX',
  apiBaseUrl: 'https://your-backend-url.com'
});
```

## Step 5: Add UI Elements
```jsx
<input 
  type="email" 
  placeholder="Enter email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<button onClick={() => connectWallet(email)}>
  Connect Wallet
</button>

<button onClick={() => loginWithEmail(email, true)}>
  Login with Email
</button>

{isConnected && <button onClick={disconnectWallet}>Disconnect</button>}

{statusMessage && <p>{statusMessage}</p>}
{isConnected && <p>Wallet: {walletId}</p>}
```

## Step 6: Configure Environment Variables
Set these in your `.env`:
```
VITE_DROPP_MERCHANT_ID=your-merchant-id
VITE_DROPP_ENVIRONMENT=SANDBOX
VITE_DROPP_API_URL=https://your-backend-url.com
```

## For Next.js Apps

### Step 2 (Next.js): Install Dependencies
```bash
npm install @hashgraph/hedera-wallet-connect@^2.0.4 @hashgraph/sdk@^2.79.0
```

### Step 1 (Next.js): Copy Plugin Files
Copy files to `public/libs/` directory:
- `dropp-wallet-plugin.es.js` (or `.umd.js`)
- `dropp-wallet-plugin.css`

### Step 3 (Next.js): Create Client Component
Add `'use client'` directive at the top of your component:

```jsx
'use client';

import { useDroppWallet } from '../../public/libs/dropp-wallet-plugin.es.js';
import '../../public/libs/dropp-wallet-plugin.css';
import { useState } from 'react';

export default function WalletComponent() {
  const [email, setEmail] = useState('');
  
  const { isConnected, walletId, statusMessage, connectWallet, loginWithEmail, disconnectWallet } = useDroppWallet({
    merchantId: process.env.NEXT_PUBLIC_DROPP_MERCHANT_ID,
    environment: process.env.NEXT_PUBLIC_DROPP_ENVIRONMENT,
    apiBaseUrl: process.env.NEXT_PUBLIC_DROPP_API_URL
  });

  return (
    <div>
      <input 
        type="email" 
        placeholder="Enter email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={() => connectWallet(email)}>Connect Wallet</button>
      <button onClick={() => loginWithEmail(email, true)}>Login with Email</button>
      {isConnected && <button onClick={disconnectWallet}>Disconnect</button>}
      {statusMessage && <p>{statusMessage}</p>}
    </div>
  );
}
```

### Step 4 (Next.js): Configure Environment Variables
Set these in your `.env.local`:
```
NEXT_PUBLIC_DROPP_MERCHANT_ID=your-merchant-id
NEXT_PUBLIC_DROPP_ENVIRONMENT=SANDBOX
NEXT_PUBLIC_DROPP_API_URL=https://your-backend-url.com
```

**Key Differences:**
- Use `NEXT_PUBLIC_` prefix for client-side accessible env variables
- Add `'use client'` directive for client-side hooks
- Copy plugin files to `public/` instead of `src/libs/`
- Use `process.env.NEXT_PUBLIC_*` to access variables

## Available Methods

| Method | Purpose |
|--------|---------|
| `connectWallet(email)` | Opens QR code modal to connect wallet |
| `loginWithEmail(email, openInNewTab)` | Direct email login (opens in new tab if true) |
| `disconnectWallet()` | Disconnect wallet |

## Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | boolean | Wallet connected status |
| `walletId` | string | Connected account ID |
| `statusMessage` | string | Status/error message |
| `isLoading` | boolean | Loading state |
| `connectWallet` | function | Connect method |
| `loginWithEmail` | function | Email login method |
| `disconnectWallet` | function | Disconnect method |

That's it! You're ready to use the Dropp Wallet Plugin.
