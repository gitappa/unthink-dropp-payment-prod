# Dropp SDK JavaScript

The Dropp SDK JavaScript is a payment processing library that enables seamless integration of Dropp payment services into your JavaScript/Node.js applications.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Features](#features)
- [API Reference](#api-reference)
- [Environment Setup](#environment-setup)
- [Frontend SDK Usage](#frontend-sdk-usage)

## Installation

> **Note:** You must use **Node.js version 18 or higher** to run this SDK.

Since Dropp JS SDK is not published in the public NPM registry, you need to include it as a local dependency in your project:

1. Copy the `dropp-sdk-js` folder to your project directory
2. Add it as a local dependency in your `package.json`:

```json
{
  "dependencies": {
    "dropp-sdk-js": "file:./dropp-sdk-js/"
  }
}
```

3. Run npm install to install the local dependency:

```bash
npm install
```

4. To run the application:

```bash
npm run dev
```

## Configuration

Before using the SDK, you need to set up your environment variables:

```env
DROPP_ENVIRONMENT=SANDBOX  # or PROD
DROPP_MERCHANT_ID=your_merchant_id
DROPP_MERCHANT_SIGNING_KEY=your_signing_key
```

## Features

The Dropp SDK provides the following key features:

1. **Single Payment Processing**
   - Process one-time payments
   - Support for various currencies
   - Secure payment handling

2. **Recurring Payments**
   - Set up recurring payment schedules
   - Handle payment authorizations
   - Process recurring transactions

3. **Credit Payments**
   - Merchant crediting funds to users
   - Flexible redemption options

4. **UUID Generation and Status Tracking**
   - Generate unique identifiers for invoice
   - Track invoice payment status

5. **Authorize A Parent Merchant**
   - Generate authorize URL

6. **Payment For Sub-Merchant**
   - Parent merchant submits payment on behalf of sub merchant

7. **Get Payment Transactions**
   - Get all payment transactions for parent merchant


## API Reference

### DroppClient

The main client class for interacting with the Dropp API.

```javascript
const droppClient = new DroppClient(environment);
```

### DroppPaymentRequest

Handles single payment processing.

```javascript
const paymentRequest = new DroppPaymentRequest(droppClient);
```

### DroppRecurringPaymentRequest

Manages recurring payment operations.

```javascript
const recurringRequest = new DroppRecurringPaymentRequest(droppClient);
```

### DroppCreditPaymentRequest

Processes credit-based payments.

```javascript
const creditRequest = new DroppCreditPaymentRequest(droppClient);
```

### UUID Generation

Generates UUID for an invoice.

```javascript
const uuidResponse = await droppClient.generateUUID(
  { merchantAccount: process.env.DROPP_MERCHANT_ID,
    amount: 0.1,
    currency: 'USD',
    description: 'Test payment',
    reference: 'TEST-REF-001',
    thumbnail: 'https://your-domain.com/images/product.jpg',
    url: 'http://localhost:8000/callback'
  });
```

### Payment Status Check For UUID

Checks status of invoice payment.

```javascript
const statusResponse = await droppClient.waitForCompletion('your-payment-uuid', 3);
```

### Authorize a Parent Merchant

To authorize a parent merchant, generate an authorization URL using your parent merchant account ID. Share this URL with the sub-merchant, who must visit it to complete the authorization process.

```javascript
// Generate the authorization URL for the sub-merchant
const authorizeUrl = droppClient.getUrlForSubMerchantAuthorization('your-parentMerchantId');
```

| Parameter               | Type     | Description                                 |
|-------------------------|----------|---------------------------------------------|
| parentMerchantId        | string   | Parent merchant's account ID (Required)     |

> **Note:** The sub-merchant must visit the generated URL to complete the authorization process.

### Get Transactions for Parent Merchant

Retrieve a list of transactions for the parent merchant.

```javascript
const getTransactions = new DroppTransactionRequest(droppClient);
```

## Environment Setup

The SDK supports two environments:

1. **Development**
   - Use for testing and development
   - Set `DROPP_ENVIRONMENT=SANDBOX`

2. **Production**
   - Use for live transactions
   - Set `DROPP_ENVIRONMENT=PROD`


## Support

For support and questions, please contact:
- Email: support@dropp.com
- Documentation: https://docs.dropp.com
- API Reference: https://api.dropp.com/docs

# Dropp JS SDK Sample Code
<!-- Sample code: version 0.0.2

SDK: version 0.1.0

SDK version (0.1.0) includes breaking change and is not backward compatible with prior versions. -->

## Overview
This provides an example usage of accepting and processing payment using Dropp JS SDK.
This is provided to showcase the usage of Dropp JS SDK and to serve as a reference.


## Prerequisites

### Dropp Merchant Account
- A fully approved and onboarded Dropp merchant account is needed. You can register for an account at
  https://merchant.portal.dropp.cc/register
- When approval is still pending, you can continue to test it in sandbox environment. See merchant onboarding guide for
  details on enabling and testing in a sandbox environment. Onboarding guide is available in the merchant portal.
- Merchant signing key. Use the signing key provided during onboarding of your Dropp merchant account.

### Dropp Consumer Account
- Download Dropp mobile app, and browser extension. You can get them here: https://dropp.cc/get-dropp-app/
- To test in sandbox environment, turn on the sandbox mode.
  Follow instructions here: http://docs.dropp.cc/docs/onboarding-guide/tutorials/testing
- Sign up using the mobile app.
- You can also set up the desktop browser extension easily once the mobile app is set up. Using your Dropp mobile app, scan
  the QR code shown in the desktop browser extension and that will sync/ set up the extension. Now you can use either the mobile
  app or the extension to make payments.




## How to use


### Sample Use Cases and Files provided

Pages showcasing certain use cases are provided under `pages` folder.
Samples provided:
- **Single Payment**. This is customer paying for a purchase.
- **Redemption/Credit payment**. This is merchant paying or crediting the customer.
- **Recurring Payments / micro-subscriptions**. This is recurring payments or subscriptions.
- **UUID Generation and Status Tracking**. This is to generate UUID and check payment status.
- **Authorize a Parent Merchant**. Generate an authorization URL for a sub-merchant.
- **Payment For Sub-Merchant**. Parent merchant submits payment on behalf of a sub-merchant.
- **Get Payment Transactions**. Retrieve all payment transactions for a parent merchant.

The index page `pages/index.html` serves as the main landing page and links to the other samples provided.

##

### Use Case: Single Payment
This is the use case of customer making the payment for their purchase.

**Single payment flow**:

- Customer clicks the Buy button from your product page.
- This invokes the customer wallet for confirmation showing details of the purchase (provided by you).
   Our frontend JS SDK does this magic. See `single-payment.html` for details.
- Customer approves paying for the purchase from their wallet. This then triggers a callback URL (provided by you) sending in
  the payment invoice payload as request parameter. We call this payload P2P, short for Promise To Pay.
- You'd implement this callback to perform:
  - any validation or server side logic you need,
  - then sign & submit the p2p to Dropp services for payment. This is neatly abstracted out by the SDK, so all you need to do
    is call a function and pass in the p2p object and your signing key as inputs. The SDK takes care of the rest.

To see this in action, just update `single-payment.html` to include your merchant ID and run it (see below on how to run this sample).
`data-merchant-id="0.0.12345678"`


### How to Run this

- You can run it by executing `node index.js` command or use the corresponding code in your existing setup.
- By default, this will start the service in port 8000. Navigate to http://localhost:8000 in your browser and then click on
  'Single Payment' link to load the single payment sample page (`pages/single-payment.html`)
- Click on the 'Pay with Dropp' button to trigger payment. This will open the browser extension if you have it installed.
  Alternately, an option to pay by scanning the QR code with the mobile app is also available.
- Clicking on 'Pay' in the browser extension or mobile app will load the callback url provided in the
  `single-payment.html` page. `data-callback-url="http://localhost:8000/callback"`
- Callback will receive a p2p parameter consisting of payment information (aka Invoice data). You, as a merchant, will then sign
  this information using your signing key and post to Dropp service for payment. You can follow along the code in
  `requestListener()` in `index.js` on how this is done using Dropp JS SDK.

### Example
```javascript
const droppSdk = require('./dropp-sdk-js');

const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
const paymentRequest = new droppSdk.DroppPaymentRequest(droppClient);

const p2pData = {
    // p2pData comes from the Dropp payment button callback from the app
};

paymentRequest.submit(p2pData, process.env.DROPP_MERCHANT_SIGNING_KEY)
    .then(response => {
        console.log('Payment successful:', response);
    })
    .catch(error => {
        console.error('Payment failed:', error);
    });
```


### P2P (Promise to Pay) Object

When a customer approves a payment from their wallet, the callback URL receives a P2P (Promise to Pay) object containing payment information from the wallet. This object is of type `IPromiseToPay` and contains the following fields:

| Field                           | Type                | Description |
|---------------------------------|---------------------|-------------|
| `payer`                         | `string`            | Payer's Dropp account identifier. **(Required)** |
| `invoiceBytes`                  | `string`            | Base64 encoded invoice data. **(Required)** |
| `timeStamp`                     | `number`            | Timestamp when the promise object was created. **(Required)** |
| `signatures`                    | `Signatures`        | Object containing payer, merchant, and Dropp signatures. **(Required)** |
| `encodedHHTransfer`             | `string` (optional) | Encoded Hedera Hashgraph transfer data. (Only For Crypto Transactions) |
| `distributionBytes`             | `string` (optional) | Base64 encoded distribution data for revenue sharing. For example: Decoded ditributiondata={ "0.0.4646049": 10 } |
| `purchaseURL`                   | `string` (optional) | URL to purchase the item. |
| `shareURL`                      | `string` (optional) | URL to share the content/item. |
| `walletCurrency`                | `string` (optional) | Currency of the payer's wallet. (For e.g.- USD) |
| `exchangeRate`                  | `number` (optional) | Exchange rate between currencies. |

#### Signatures Object

The `signatures` field contains the following properties:

| Field           | Type                | Description |
|-----------------|---------------------|-------------|
| `payer`         | `string` (optional) | Signature from the payer's wallet. |
| `merchant`      | `string` (optional) | Signature from the merchant (added by SDK). |

#### Decoded Invoice Data

The `invoiceBytes` field contains base64-encoded invoice data that can be decoded to reveal:

| Field                | Type                | Description |
|----------------------|---------------------|-------------|
| `merchantAccount`    | `string`            | Merchant's account identifier (e.g.- 0.0.xxxxx). **(Required)** |
| `reference`          | `string`            | Reference ID for the payment (e.g., Your internal system/order ID). **(Required)** |
| `amount`             | `number`            | Payment amount. **(Required)** |
| `currency`           | `string`            | Currency of the payment (e.g., USD). **(Required)** |
| `details`            | `string` (optional) | Description of the payment. |
| `thumbnail`          | `string` (optional) | URL to a product image. |
| `purchaseExpiration` | `number` (optional) | Expiration time for the purchase (in seconds). |
| `referralFee`        | `number` (optional) | Referral fee in percent for the payment. |
| `referralAccount`    | `string` (optional) | Referral account identifier. |
| `distribution`       | `string` (optional) | Merchants use a distribution object mapping account IDs to percentages to share earnings. For example: { "0.0.4646049": 10 } |
| `offerCode`          | `string` (optional) | Applied offer code. |
| `discountedAmount`   | `number` (optional) | Amount after discount. |
| `acceptPaymentDelay` | `boolean` (optional)| Whether to accept delay in ACH payments. |
| `qrCodeUUID`         | `string` (optional) | UUID of the payment invoice. |

> **Note:** The SDK automatically handles the merchant signature generation when you call `submit(p2p, signingKey)`. You only need to validate the P2P data and pass it to the SDK.

### Use Case: Redemption/Credit Payment
This is the use case of merchant paying or crediting the customer.

- Start the service by following the instructions provided in 'How to Run this' section above.
- Then load `redeem.html` in your browser. You can navigate to this page from `index.html`
- Enter the Dropp account ID of the user would like to send credit.
- Enter the amount of credit (in $) you'd like to send and click 'Redeem' button.
- This is submitted to `/redeem-callback` which in turn calls Dropp services to post a credit payment.
- You can follow along the code in
  `requestListener()` in `index.js` on how this is done using Dropp JS SDK.


### Example

```javascript
const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
const creditRequest = new droppSdk.DroppCreditPaymentRequest(droppClient);

const creditData = {
    merchantAccountId: process.env.DROPP_MERCHANT_ID,
    userAccountId: '0.0.12345',
    amount: 10.00,
    currency: 'USD',
    creditReference: 'Test credit',
    ipAddress: '127.0.0.1'
};

creditRequest.submit(creditData, process.env.DROPP_MERCHANT_SIGNING_KEY)
    .then(response => {
        console.log('Credit payment successful:', response);
    })
    .catch(error => {
        console.error('Credit payment failed:', error);
    });
```

### Use Case: Recurring/Subscription Payment
This is the use case of recurring payments or micro-subscriptions.
Refer to documentation at  https://docs.dropp.cc to learn more on recurring payments.

- Start the service by following the instructions provided in 'How to Run this' section above.
- In `recurring.html, enter your merchant ID for the data-merchant-id attribute
- Then load `index.html` in your browser and then click on 'Recurring Payments' link to navigate to `recurring.html`.
- Click on the pay button. This will open the browser extension if you have it installed, to confirm the recurring payment authorization.

Recurring payment is a multistep process.
1. Create a recurring payment authorization.
This would establish a recurring payment authorization between the customer and merchant.
You would get an authorization token in the response. Use this token to make recurring payments when payment is due.
2. Make a recurring payment using the authorization token obtained in Step 1.

Step 1: Create a recurring payment authorization
  ```javascript

   new DroppRecurringPaymentRequest(new DroppClient(environment))
        .submitForAuthorization(recurringPaymentPayload, signingKey);

  ```
Step 2: Make a recurring payment using the authorization token obtained in step 1.
  ```javascript

   new DroppRecurringPaymentRequest(new DroppClient(environment))
        .submitForPayment(recurringDueData, signingKey);

  RecurringDueData is
  {
    merchantAccountId, //string
    amount, //number;
    recurringToken //string;
}
  ```

### Example

```javascript
const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
const rps = new droppSdk.DroppRecurringPaymentRequest(droppClient);

// First, submit for authorization
rps.submitForAuthorization(recurringData, signingKey)
    .then(authResponse => {
        if (authResponse.responseCode === 0) {
            // Then submit for payment
            return rps.submitForPayment({
                merchantAccountId: process.env.DROPP_MERCHANT_ID,
                amount: 0.01,
                recurringToken: authResponse.data.recurringToken
            }, signingKey);
        }
    })
    .then(paymentResponse => {
        console.log('Recurring payment successful:', paymentResponse);
    })
    .catch(error => {
        console.error('Recurring payment failed:', error);
    });
```

### Use Case: Generate UUID and Track Status

This use case demonstrates how to generate a UUID for a payment and track its status using the Dropp SDK.

#### Step 1: Generate UUID

```javascript
const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);

// Configure your payment(invoice) object. The payment object is of type `PaymentRequestData` given below.
const paymentDetails = {
    merchantAccount: process.env.DROPP_MERCHANT_ID,
    amount: 0.1,
    currency: 'USD',
    description: 'Test payment',
    reference: 'TEST-REF-001',
    thumbnail: 'https://your-domain.com/images/product.jpg',
    url: 'http://localhost:8000/callback' // Here you need to provide callback URL
};

// Submit to Dropp and receive unique UUID for this payment.
droppClient.generateUUID(paymentDetails)
    .then(uuidResponse => {
        console.log('UUID generated:', uuidResponse);
        // Store the UUID for later status checks
        const paymentUUID = uuidResponse.data.uuid;
        // store link for QRCode with uuid
        const qrCodeLink = uuidResponse.data.link;
        // You can now use this UUID to track payment status
        return checkPaymentStatus(paymentUUID);
    })
    .catch(error => {
        console.error('UUID generation failed:', error);
    });
```

#### PaymentRequestData Object

The `PaymentRequestData` object is used when generating a UUID for a payment. Below are the available fields, their types, and descriptions:

| Field               | Type                | Description |
|---------------------|---------------------|-------------|
| `title`             | `string` (optional) | Title of the payment request. |
| `type`              | `string` (optional) | Type of the product (e.g., Video, News). |
| `merchantAccount`   | `string`            | Merchant's account identifier (e.g.- 0.0.xxxxx). **(Required)** |
| `reference`         | `string`            | Reference ID for the payment (e.g., Your internal system/order ID). **(Required)** |
| `currency`          | `string`            | Currency of the payment (e.g., USD). **(Required)** |
| `thumbnail`         | `string` (optional) | URL to a product image. |
| `description`       | `string` (optional) | Description of the payment. |
| `url`               | `string`            | Callback or redirect URL. **(Required)** |
| `amount`            | `number`            | Payment amount. **(Required)** |
| `purchaseExpiration`| `number` (optional) | Expiration time for the purchase (in seconds). |
| `referralFee`       | `number` (optional) | Referral fee in percent for the payment. |
| `distribution`      | `string` (optional) | Merchants use a distribution object mapping account IDs to percentages to share earnings. For example: { "0.0.4646049": 10 } |
| `purchaseURL`       | `string` (optional) | URL to purchase the item. |
| `shareURL`          | `string` (optional) | URL to share the content/item. |
| `tax`               | `number` (optional) | Tax amount. |
| `tip`               | `number` (optional) | Tip amount. |
| `acceptPaymentDelay`| `boolean` (optional)| Whether to accept delay in ACH payments. |
| `noOffers`          | `boolean` (optional)| Whether to show offers on the payment screen. |

> **Note:** Only `merchantAccount`, `reference`, `url`, `amount` and `currency` are required. All other fields are optional and can be used as needed for your payment scenario.

#### Step 2: Check Payment Status

```javascript
// Function to check payment status
async function checkPaymentStatus(paymentUUID) {
    try {
        // The second parameter (3) is the number of retries
        const statusResponse = await droppClient.waitForCompletion(paymentUUID, 3);
        console.log('Payment status:', statusResponse);

        // Handle different status responses
        switch(statusResponse.data) {
            case 'SUCCESS':
                console.log('Payment completed successfully');
                // Update your database or trigger success actions
                break;
            case 'WAIT':
                console.log('Payment is still pending');
                // Continue monitoring if needed
                setTimeout(() => checkPaymentStatus(paymentUUID), 5000);
                break;
            case 'FAILED':
                console.log('Payment failed');
                // Handle failed payment
                break;
            default:
                console.log('Unknown status:', statusResponse.data);
        }
    } catch (error) {
        console.error('Status check failed:', error);
        // Implement retry logic or error handling
    }
}
```

### Use Case: Authorize a Parent Merchant

This use case demonstrates how to generate authorize URL for sub-merchant.

```javascript
function getAuthorizeUrl(res: Res) {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
  try {
    const url = droppClient.getUrlForSubMerchantAuthorization(parentMerchantId);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, authorizeUrl: url }));
    log(`URL: ${url}.`);
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: 'Failed to get authorize URL' }));
  }
}
```

#### RequestData Object

| Field             | Type     | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `parentMerchantId` | `string`   | Parent merchant's account ID **(Required)**.      |


### Use Case: Payment For Sub-Merchant

This use case is similar flow as single payment Flow with additional parameters


- Customer clicks the Buy button from your product page.
- This invokes the customer wallet for confirmation showing details of the purchase (provided by you).
   Our frontend JS SDK does this magic. See `single-payment-for-sub-merchant.html` for details.
- Customer approves paying for the purchase from their wallet. This then triggers a callback URL (provided by you) sending in
  the payment invoice payload as request parameter. We call this payload P2P, short for Promise To Pay.
- You'd implement this callback to perform:
  - any validation or server side logic you need,
  - then sign & submit the p2p to Dropp services for payment. This is neatly abstracted out by the SDK, so all you need to do
    is call a function and pass in the p2p object and your signing key as inputs. The SDK takes care of the rest.

To see this in action, just update `single-payment-for-sub-merchant.html` to include your Sub merchant ID and distribution.

`data-merchant-id="0.0.12345678"`
`data-distribution='{"0.0.4646049": 10}'`


#### Frontend Example
```html
// Create payment button
<a class="dropp-payment"
   data-amount="0.1"
   data-callback-url="Parent Merchant Callback URL"
   data-currency="USD"
   data-description="Pixels Sample Sale"
   data-merchant-id="Sub Merchant Account Id (e.g. - 0.0.797623)"
   data-distribution='{"Parent Merchant Account ID (e.g. - 0.0.4646049)": Value in percentage (e.g.- 10)}'
   data-reference="Pix Art"
   data-thumbnail="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/
   Pixel_geometry_01_Pengo.jpg/400px-Pixel_geometry_01_Pengo.jpg"
    <button>Pay with <img height="16px" src="https://merchant.portal.dropp.cc/images/dropp_icon.png"/></button>
</a>
```

#### Backend Example
```javascript
const droppSdk = require('./dropp-sdk-js');

const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
const paymentRequest = new droppSdk.DroppPaymentRequest(droppClient);

const p2pData = {
    // p2pData comes from the Dropp payment button callback from the app
};

paymentRequest.submitForSubMerchant(p2pData, process.env.DROPP_MERCHANT_SIGNING_KEY, process.env.DROPP_MERCHANT_ID)
    .then(response => {
        console.log('Payment successful:', response);
    })
    .catch(error => {
        console.error('Payment failed:', error);
    });
```


### Use Case: Get Payment Transactions

This use case demonstrates how to get all payment transactions for a parent merchant.

#### Backend Example

```javascript
const droppSdk = require('./dropp-sdk-js');

// Prepare the Dropp client
const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT);
// Prepare the transaction request handler
const transactionRequest = new droppSdk.DroppTransactionRequest(droppClient);

// Define your request parameters
const requestParameters = {
    userId: process.env.DROPP_MERCHANT_ID, // Parent merchant ID
    offset: 0,   // Pagination start index
    limit: 10,    // Number of results you want
};

const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY;

transactionRequest.getTransactions(requestParameters, signingKey)
    .then(response => {
        console.log('Transactions:', response);
    })
    .catch(error => {
        console.error('Failed to fetch transactions:', error);
    });
```

#### TransactionRequest Object

| Field             | Type     | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `userId`          | `string`   | Parent merchant's account ID **(Required)**.      |
| `offset`          | `number` (Optional)   | Pagination start index                        |
| `limit`           | `number` (Optional)   | Pagination end index                          |

---


## Frontend SDK Usage

### Installation

Include the Dropp SDK in your HTML file:

#### For SANDBOX
```html
<script src="https://sandbox.merchantportal.dropp.cc/dropp-sdk/dropp.min.js" type="text/javascript"></script>
```

#### For PRODUCTION
```html
<script src="https://merchant.portal.dropp.cc/dropp-sdk/dropp.min.js"></script>
```


### Basic Usage

```html
// Create payment button
<a class="dropp-payment"
   data-amount="0.1"
   data-callback-url="http://localhost:8000/callback"
   data-currency="USD"
   data-description="Pixels Sample Sale"
   data-merchant-id="0.0.123456"
   data-reference="Pix Art"
   data-thumbnail="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/
   Pixel_geometry_01_Pengo.jpg/400px-Pixel_geometry_01_Pengo.jpg"
    <button>Pay with <img height="16px" src="https://merchant.portal.dropp.cc/images/dropp_icon.png"/></button>
</a>
```