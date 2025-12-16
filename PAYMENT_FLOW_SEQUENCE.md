# Dropp REST API Payment Flow - Complete Sequence Documentation

## Overview

This document describes the complete end-to-end flow for accepting Dropp payments using the new **REST API handlers** in `src/routes/payment-routes.ts`. This approach allows any client (web, mobile, backend service, third-party integrator) to initiate and process payments dynamically without relying on the Dropp SDK frontend widget.

---

## Architecture Comparison

### Original Flow (Frontend Widget Button)
```
Client Browser
    ↓
[pages/single-payment.html] - Dropp SDK button
    ↓
Dropp SDK (dropp.min.js)
    ↓
POST /payer/v1/checkouts → Dropp API
    ↓
Dropp Wallet/Extension
    ↓
User approval
    ↓
Wallet → POST /callback (callback-url from HTML)
    ↓
[index.ts] /callback handler
    ↓
Dropp SDK submit → Dropp API
```

### New REST API Flow (Recommended)
```
Any Client (Web, Mobile, Backend Service)
    ↓
POST /api/payments/checkout (your server)
    ↓
[src/routes/payment-routes.ts] /checkout handler
    ↓
Dropp SDK generateUUID()
    ↓
Response: redirectUrl, checkoutId, qrCodeUrl
    ↓
Client redirects user to redirectUrl
    ↓
Dropp Wallet/Extension
    ↓
User approval
    ↓
Wallet → POST /api/payments/post-callback (your server)
    ↓
[src/routes/payment-routes.ts] /post-callback handler
    ↓
Dropp SDK submit() → Dropp API
    ↓
Payment processed & response sent back to client
```

---

## Step 1: Client Initiates Checkout

**Endpoint:** `POST /api/payments/checkout`

**Request Body:**
```json
{
  "amount": 0.1,
  "currency": "USD",
  "description": "Pixels Sample Sale",
  "reference": "ORDER-12345",
  "thumbnail": "https://example.com/image.jpg",
  "merchantId": "0.0.6784854",
  "callbackUrl": "http://localhost:8000/api/payments/post-callback"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | ✅ | Payment amount |
| `currency` | string | ✅ | Currency code (USD, EUR, etc.) |
| `description` | string | ⚠️ | Item/service description |
| `reference` | string | ✅ | Unique order ID |
| `thumbnail` | string | ⚠️ | Product image URL |
| `merchantId` | string | ⚠️ | Merchant's Dropp account ID |
| `callbackUrl` | string | ⚠️ | Callback URL (defaults to /api/payments/post-callback) |

---

## Step 2: Server Creates Checkout and Generates UUID

**Handler:** `payment-routes.ts` → `POST /checkout`

**Response:**
```json
{
  "success": true,
  "checkoutId": "550e8400-e29b-41d4-a716-446655440000",
  "redirectUrl": "https://dropp.app.link/checkouts/550e8400...?uuid=550e8400...",
  "qrCodeUrl": "https://paymentslink.dropp.cc/share-wallet?uuid=550e8400...",
  "message": "Redirect user to redirectUrl to complete payment"
}
```

**Internal Process:**
1. Validate request fields
2. Build payment payload for Dropp SDK
3. Call `droppClient.generateUUID()` to create checkout
4. Store checkout mapping (checkoutId → paymentDetails)
5. Return redirect URL and QR code URL

---

## Step 3: Client Redirects User to Wallet

**What Happens:**
- Client redirects browser to `redirectUrl` OR displays QR code
- User scans QR or follows link to Dropp payment page

**JavaScript Example:**
```javascript
const response = await fetch('/api/payments/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 0.1, currency: 'USD', reference: 'ORD123', merchantId: '0.0.6784854' })
});
const data = await response.json();
window.location.href = data.redirectUrl;  // Redirect to wallet
```

---

## Step 4: User Approves in Dropp Wallet

**Location:** Dropp Wallet/Extension/Mobile App

**User Actions:**
1. Review payment details (amount, merchant, reference)
2. Approve with biometric/PIN/credentials
3. Wallet creates and signs P2P object

---

## Step 5: Wallet Sends P2P to Your Callback

**Endpoint:** `POST /api/payments/post-callback`

**Request Body (P2P Object):**
```json
{
  "payer": "0.0.999999",
  "invoiceBytes": "eyJtZXJjaGFudEFjY291bnQiOiIwLjAuNjc4NDg1NCIsInJlZmVyZW5jZSI6Ik9SREVSLTI0MzgyMSIsImFtb3VudCI6MC4xLCJjdXJyZW5jeSI6IlVTRCJ9",
  "timeStamp": 1700000000000,
  "signatures": {
    "payer": "payerSignatureBase64String"
  }
}
```

**P2P Fields:**
| Field | Description |
|-------|-------------|
| `payer` | Payer's Dropp account ID (0.0.XXXXX) |
| `invoiceBytes` | Base64-encoded original invoice |
| `timeStamp` | When P2P was created |
| `signatures.payer` | Payer's digital signature |

**Decoded invoiceBytes:**
```json
{
  "merchantAccount": "0.0.6784854",
  "reference": "ORDER-12345",
  "amount": 0.1,
  "currency": "USD",
  "description": "Pixels Sample Sale",
  "thumbnail": "https://example.com/image.jpg",
  "qrCodeUUID": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Step 6: Server Processes Payment

**Handler:** `payment-routes.ts` → `POST /post-callback`

**Internal Process:**
1. Validate P2P object
2. Decode `invoiceBytes` from Base64
3. Log and verify payment details
4. Update checkout status: `payment_received`
5. Call `DroppPaymentRequest.submit(p2pObj, signingKey)`
6. Store final response
7. Return payment status to wallet

**Response:**
```json
{
  "success": true,
  "paymentStatus": "success",
  "paymentResponse": {
    "responseCode": 0,
    "data": { "transactionId": "dropp-tx-123456" }
  },
  "invoiceData": {
    "merchantAccount": "0.0.6784854",
    "reference": "ORDER-12345",
    "amount": 0.1,
    "currency": "USD"
  }
}
```

---

## Alternative: GET Callback

**Endpoint:** `GET /api/payments/callback?p2p=<url-encoded-p2p-json>`

**Note:** Not recommended for large payloads (URL length limits)

---

## Query Checkout Status

**Endpoint:** `GET /api/payments/status/:checkoutId?merchantId=0.0.6784854`

**Response:**
```json
{
  "success": true,
  "checkoutId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "createdAt": "2025-11-11T10:30:00Z",
  "paymentDetails": { ... },
  "paymentResponse": { "responseCode": 0, ... }
}
```

---

## Complete Web Client Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Dropp REST API Payment</title>
</head>
<body>
  <button onclick="initiatePayment()">Pay 0.1 USD with Dropp</button>

  <script>
    async function initiatePayment() {
      try {
        // Step 1: Call your backend to initiate checkout
        const response = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 0.1,
            currency: 'USD',
            description: 'Test Purchase',
            reference: 'ORDER-' + Date.now(),
            thumbnail: 'https://example.com/image.jpg',
            merchantId: '0.0.6784854'
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Step 2: Redirect to wallet
          window.location.href = data.redirectUrl;
          
          // OR display QR code (requires QR code library)
          // displayQRCode(data.qrCodeUrl);
        } else {
          alert('Error: ' + data.error);
        }
      } catch (error) {
        console.error('Checkout failed:', error);
        alert('Failed to initiate payment');
      }
    }

    async function checkPaymentStatus(checkoutId) {
      const response = await fetch(
        `/api/payments/status/${checkoutId}?merchantId=0.0.6784854`
      );
      const data = await response.json();
      
      if (data.success) {
        console.log('Payment Status:', data.status);
        if (data.status === 'completed') {
          alert('✓ Payment successful!');
        }
      }
    }
  </script>
</body>
</html>
```

---

## Error Handling

### Checkout Creation Errors

**400 - Missing Fields:**
```json
{ "success": false, "error": "Missing required fields: amount, currency, reference, merchantId" }
```

**500 - UUID Generation Failed:**
```json
{ "success": false, "error": "Failed to generate checkout UUID" }
```

### Callback Processing Errors

**400 - Invalid P2P:**
```json
{ "success": false, "error": "Invalid P2P object: missing required fields" }
```

**500 - Payment Submission Failed:**
```json
{ "success": false, "error": "Payment processing failed: signature validation error" }
```

---

## Production Deployment Checklist

1. ✅ Install dependencies: `npm install`
2. ✅ Configure environment variables (`.env`)
3. ✅ Replace in-memory `checkoutStore` with a real database (MongoDB/PostgreSQL)
4. ✅ Use `index-express.ts` as your new server (migrate from the original `index.ts`)
5. ✅ Implement rate limiting on `/checkout` endpoint
6. ✅ Add HTTPS enforcement
7. ✅ Enable audit logging for all transactions
8. ✅ Validate merchant ID and amounts on server side
9. ✅ Test with Dropp sandbox environment first
10. ✅ Deploy to production environment

---

## Key Advantages

- **Language Agnostic:** Any client (JavaScript, Python, Java, etc.)
- **No Frontend SDK Required:** Works without Dropp SDK button
- **Backend Control:** Full control over payment flow
- **Dynamic Payments:** Build payments programmatically
- **Mobile-friendly:** Supports web and mobile redirects
- **Persistent Storage:** Can store checkout and transaction data
- **Third-party Integration:** Easy to integrate with external systems

---

## Security Best Practices

1. Always use HTTPS in production
2. Keep `DROPP_MERCHANT_SIGNING_KEY` in environment variables
3. Validate all inputs on the server side
4. Implement rate limiting to prevent abuse
5. Log all transactions for auditing
6. Use a real database instead of in-memory storage
7. Implement proper error handling without exposing sensitive data
8. Regularly rotate signing keys

---

## Summary

The new REST API approach (`/api/payments/*`) provides a **flexible, backend-driven way** to process Dropp payments that works with any client technology, unlike the frontend SDK button approach which requires the Dropp JavaScript SDK.

### Flow in 3 Steps:
1. **Client POST** → `/api/payments/checkout` with payment details
2. **Server returns** → checkout ID + redirect URL
3. **Server receives** → `/api/payments/post-callback` with P2P after user approval, submits payment to Dropp
