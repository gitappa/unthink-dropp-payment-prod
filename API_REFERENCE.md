# REST API Quick Reference

## Base URL
```
http://localhost:8000/api/payments
```

## Endpoints

### 1. Initiate Checkout
**Create a new payment checkout and get redirect URL**

```http
POST /api/payments/checkout
Content-Type: application/json

{
  "amount": 0.1,
  "currency": "USD",
  "description": "Product name or description",
  "reference": "unique-order-id",
  "thumbnail": "https://example.com/image.jpg",
  "merchantId": "0.0.YOUR_MERCHANT_ID",
  "callbackUrl": "http://your-server/api/payments/post-callback"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "checkoutId": "550e8400-e29b-41d4-a716-446655440000",
  "redirectUrl": "https://dropp.app.link/checkouts/...",
  "qrCodeUrl": "https://paymentslink.dropp.cc/share-wallet?uuid=...",
  "message": "Redirect user to redirectUrl"
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Error description"
}
```

---

### 2. Handle Payment Callback (POST)
**Wallet sends P2P after user approval - process payment**

```http
POST /api/payments/post-callback
Content-Type: application/json

{
  "payer": "0.0.XXXXX",
  "invoiceBytes": "base64_encoded_string",
  "timeStamp": 1700000000000,
  "signatures": {
    "payer": "signature_string"
  }
}
```

**Response (200 OK):**
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

### 3. Handle Payment Callback (GET - Alternative)
**Alternative GET-based callback (less recommended)**

```http
GET /api/payments/callback?p2p={url-encoded-p2p-json}
```

---

### 4. Check Checkout Status
**Query the status and details of a checkout**

```http
GET /api/payments/status/{checkoutId}?merchantId=0.0.YOUR_MERCHANT_ID
```

**Response (200 OK):**
```json
{
  "success": true,
  "checkoutId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "createdAt": "2025-11-11T10:30:00Z",
  "paymentDetails": { ... },
  "paymentResponse": { ... }
}
```

---

## Checkout Status Values

| Status | Meaning |
|--------|---------|
| `initiated` | Checkout created, waiting for user approval |
| `payment_received` | P2P received from wallet, processing |
| `completed` | Payment successfully processed |
| `failed` | Payment processing failed |

---

## Testing with cURL

### Test Checkout Creation
```bash
curl -X POST http://localhost:8000/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 0.1,
    "currency": "USD",
    "description": "Test Item",
    "reference": "TEST-001",
    "merchantId": "0.0.6784854"
  }'
```

### Test Status Query
```bash
curl http://localhost:8000/api/payments/status/550e8400-e29b-41d4-a716-446655440000?merchantId=0.0.6784854
```

---

## Testing with Postman

1. **Create new POST request** to `http://localhost:8000/api/payments/checkout`
2. **Set Body → raw → JSON:**
   ```json
   {
     "amount": 0.1,
     "currency": "USD",
     "description": "Test Purchase",
     "reference": "ORDER-123",
     "merchantId": "0.0.6784854"
   }
   ```
3. **Send** and get `redirectUrl`
4. **Open** the `redirectUrl` in browser to see Dropp wallet

---

## Testing with JavaScript

```javascript
// Initiate payment
async function pay() {
  const response = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 0.1,
      currency: 'USD',
      description: 'Test',
      reference: 'ORD-' + Date.now(),
      merchantId: '0.0.6784854'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    window.location.href = data.redirectUrl;
  }
}

// Check status
async function checkStatus(checkoutId) {
  const res = await fetch(`/api/payments/status/${checkoutId}?merchantId=0.0.6784854`);
  const data = await res.json();
  console.log('Status:', data.status);
}
```

---

## Testing with PowerShell

```powershell
# Checkout
$body = @{
  amount = 0.1
  currency = "USD"
  description = "Test"
  reference = "ORDER-123"
  merchantId = "0.0.6784854"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/payments/checkout" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body

# Status
Invoke-RestMethod -Uri "http://localhost:8000/api/payments/status/550e8400-e29b-41d4-a716-446655440000?merchantId=0.0.6784854"
```

---

## Field Validation

### Required Fields
- `amount` (number > 0)
- `currency` (string, e.g., "USD")
- `reference` (string, unique)
- `merchantId` (string, format: "0.0.XXXXXX")

### Optional Fields
- `description` (string, ≤500 chars)
- `thumbnail` (string, valid URL)
- `callbackUrl` (string, valid URL, defaults to server's `/api/payments/post-callback`)
- `title` (string)
- `type` (string)
- `distribution` (object, for sub-merchant splits)
- `acceptPaymentDelay` (boolean)
- `noOffers` (boolean)

---

## Environment Variables Required

```env
DROPP_ENVIRONMENT=SANDBOX
DROPP_MERCHANT_ID=0.0.6784854
DROPP_MERCHANT_SIGNING_KEY=your_signing_key_here
```

---

## Response Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Successful request |
| 400 | Bad Request | Missing/invalid fields |
| 404 | Not Found | Checkout not found |
| 500 | Server Error | Internal error (check logs) |

---

## Common Errors

### "Missing required fields: amount, currency, reference, merchantId"
- Ensure all 4 fields are present in request body
- Verify merchantId format: "0.0.XXXXXX"

### "Failed to generate checkout UUID"
- Check Dropp SDK is properly installed
- Verify DROPP_ENVIRONMENT is set correctly
- Check internet connectivity to Dropp API

### "Invalid P2P object: missing required fields"
- Wallet didn't send proper P2P object
- Check callback URL is accessible and running

### "Payment processing failed: signature validation error"
- Verify DROPP_MERCHANT_SIGNING_KEY is correct
- Check Dropp environment matches (SANDBOX vs PROD)

---

## Best Practices

1. ✅ Always use HTTPS in production
2. ✅ Validate `amount` and `reference` on server before checkout
3. ✅ Store checkoutId in database for persistence
4. ✅ Implement timeout/retry logic for failed payments
5. ✅ Don't expose signing key in client-side code
6. ✅ Log all payment attempts for auditing
7. ✅ Test with sandbox environment first
8. ✅ Handle network timeouts gracefully

---

## Useful Links

- Dropp Documentation: https://docs.dropp.cc
- Sandbox Merchant Portal: https://sandbox.merchantportal.dropp.cc
- Production Merchant Portal: https://merchant.portal.dropp.cc
- API Reference: https://api.dropp.com/docs
