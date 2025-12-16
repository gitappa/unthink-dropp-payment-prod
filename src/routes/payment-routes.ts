import { Router, Request, Response } from 'express';
import * as droppSdk from '../../dropp-sdk-js';
import { IInvoice } from '../../dropp-sdk-js/dropp-payloads';
import { createTransactionRecord, updateTransactionRecord, verifyHederaTransaction, extractHederaTransactionId } from '../middleware/utils';

const router = Router();

// In-memory store for checkout mappings (merchantId -> checkoutId -> paymentDetails)
// In production, use a database like MongoDB, PostgreSQL, etc.
const checkoutStore: Record<string, Record<string, any>> = {};


function log(message: string): void {
  console.log(`[PAYMENT-ROUTES] - ${message}`);
}

/**
 * Helper function to return error response
 */
function returnError(res: Response, statusCode: number, error: string): void {
  res.status(statusCode).json({ success: false, error });
}

/**
 * Helper function to return success response
 */
function returnSuccess(res: Response, data: any): void {
  res.status(200).json({ success: true, ...data });
}



/**
 * POST /api/payments/checkout
 * 
 * Initiates a Dropp checkout by:
 * 1. Accepting payment details from client (similar to single-payment.html data-* attributes)
 * 2. Calling Dropp SDK to create a checkout via payer/v1/checkouts
 * 3. Storing the checkout mapping for later reference
 * 4. Generating a UUID for the payment
 * 5. Building and returning a redirect URL for the client
 * 
 * Request Body:
 * {
 *   "amount": 0.1,
 *   "currency": "USD",
 *   "description": "Product description",
 *   "reference": "ORDER-123",
 *   "thumbnail": "https://example.com/image.jpg",
 *   "merchantId": "0.0.XXXXXX", (optional, defaults to env DROPP_MERCHANT_ID)
 *   "distribution": {...}, (optional, for sub-merchant payments)
 *   "callbackUrl": "http://your-server/api/payments/callback" (optional, defaults to /api/payments/post-callback)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "checkoutId": "uuid-xxx",
 *   "redirectUrl": "https://dropp.app.link/checkouts/xxx?uuid=yyy",
 *   "qrCodeUrl": "https://paymentslink.dropp.cc/share-wallet?uuid=yyy"
 * }
 */
router.post('/checkout', async (req: Request, res: Response) => {
  log(`Received /checkout request process.env.DROPP_MERCHANT_ID ${process.env.DROPP_MERCHANT_ID}`);
  try {
    const {
      amount,
      currency = 'USD',
      additional_details={},
      user_id,
      store_id,
      emailId,
      service_id,
      thumbnail,
      merchantAccount = process.env.DROPP_MERCHANT_ID,
      signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY,
      distribution,
      callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/post-callback`,
      successUrl, // Client success redirect URL
      failureUrl, // Client failure redirect URL
      title,
      type,
      //description,
      successMessage,
      purchaseExpiration,
      referralFee,
      referralAccount,
      acceptPaymentDelay,
      noOffers,
      payByCC = true,
      payByBank = true,
    } = req.body;

    // Validate required fields
    let mandatory_fields = [amount, currency, user_id, store_id, emailId, service_id, merchantAccount];
    for (let field of mandatory_fields) {
      if (field === undefined || field === null || field === '') {
        log(`Missing mandatory field in request body :: ${field}`);
        return returnError(res, 400, `Missing required fields: ${field}`);
      }
    }

    try {
      const createResp = await createTransactionRecord({
        merchantAccount: merchantAccount,
        signingKey: signingKey,
        //thumbnail: thumbnail,
        payment_status: 'initiated',
        createdAt: new Date().toISOString(),
        //callbackUrl: callbackUrl,
        successUrl: successUrl,
        failureUrl: failureUrl,
        user_id: user_id,
        amount: amount,
        currency: currency,
        service_id: service_id,
        store_id: store_id,
        emailId: emailId,
        payment_method: 'dropp',
        title: title,
        type: type,
        additional_details:additional_details,
        //description: description,
        successMessage: successMessage
      });

      if (!createResp.ok) {
        log('Failed to create transaction in MongoDB.');
        return returnError(res, 500, 'Failed to create transaction record');
      }
      var transaction_details = { data: { data: createResp.data } };
    } catch (dbError) {
      log(`Failed to save checkout details to MongoDB: ${dbError}`);
    }

    
    if (additional_details && Object.keys(additional_details).length > 0) {
      additional_details.user_id = user_id;
      additional_details.store_id = store_id;
      additional_details.emailId = emailId;
      additional_details.service_id = service_id;
    }else {
      let additional_details = {
        user_id: user_id,
        store_id: store_id,
        emailId: emailId,
        service_id: service_id,
      };
    }
    
    var reference = transaction_details.data.data.transaction_id;
    //var type = JSON.stringify(additional_details || {})
    let description = Object.entries(additional_details)
      .map(([key, val]) => `${key}=${val}`)
      .join("; ");
    log(`Checkout request received for merchant ${merchantAccount}, description:: ${description}amount: ${amount} ${currency}, reference: ${reference}`);
    
    // Build the payment request payload for the Dropp SDK
    const paymentRequestPayload = {
      merchantAccount: merchantAccount,
      amount,
      currency,
      reference : reference,                       //unique reference of user "user_id|emailId"
      description: description || '',  //Description of the payment "order_id|<value>" or "collection_id|<value>" or "mfr_code|<product_id>.
      thumbnail: thumbnail || '',      //URL to a product image.
      url: callbackUrl,
      title: title || '',  //Title of the payment request.
      type: type || '',    //Type of the product (e.g., Video, News). "dothelook|usercheckin_1234"
      purchaseExpiration: purchaseExpiration || undefined,
      referralFee: referralFee || undefined,
      referralAccount: referralAccount || undefined,
      distribution: distribution || undefined,
      acceptPaymentDelay: acceptPaymentDelay || false,
      noOffers: noOffers || false,
      // Allow the client/server to request fiat on-ramp options when supported by Dropp
      payByCC: payByCC ,
      payByBank: payByBank ,
      successURL: successUrl || "",
      failureURL: failureUrl || "",
      successMessage: successMessage,
      //successCallbackUrl: successCallbackUrl || "",
      //failureCallbackUrl: failureCallbackUrl || "",
      submitToCallBack: 'POST' as const // Use POST for callback (more reliable than GET)
  
    };

    // Call the Dropp SDK to create a checkout and generate UUID
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const uuidResponse = await droppClient.generateUUID(paymentRequestPayload);

    if (!uuidResponse || uuidResponse.responseCode !== 0 || !uuidResponse.data) {
      log(`Failed to generate UUID: ${JSON.stringify(uuidResponse)}`);
      return returnError(res, 500, 'Failed to generate checkout UUID');
    }
    log(`UUID generated successfully: ${JSON.stringify(uuidResponse.data)}`);
    const checkoutId = uuidResponse.data.uuid;
    const qrCodeUrl = uuidResponse.data.link;

    /*
    // Store checkout details for later reference
    if (!checkoutStore[merchantId]) {
      checkoutStore[merchantId] = {};
    }
    checkoutStore[merchantId][checkoutId] = {
      checkoutId,
      paymentDetails: paymentRequestPayload,
      status: 'initiated',
      createdAt: new Date().toISOString(),
      callbackUrl,
      successCallbackUrl, // Store client success redirect URL
      failureCallbackUrl, // Store client failure redirect URL
    };
    */
    //_-----------ADD REST API POST CALL to add the details to mongoDB-------------
   
    try {
      const updateResp = await updateTransactionRecord(reference, {
        //paymentDetails: paymentRequestPayload,
        payment_status: 'dropp_checkout_created',
        createdAt: new Date().toISOString(),
        payment_link: qrCodeUrl,
        payment_id: checkoutId,
      });
      if (!updateResp.ok) {
        log('Failed to update checkout details to MongoDB.');
      }
    } catch (dbError) {
      log(`Failed to save checkout details to MongoDB: ${dbError}`);
    }

    log(`Checkout created successfully. CheckoutId: ${checkoutId}, QR: ${qrCodeUrl}`);

    // Build the redirect URL (wallet will redirect to this URL after approval)
    // The wallet will append the p2p object as a query parameter or POST body
    const redirectUrl = qrCodeUrl || `https://dropp.app.link/checkouts/${checkoutId}?uuid=${checkoutId}`;

    returnSuccess(res, {
      checkoutId,
      redirectUrl,
      qrCodeUrl,
      unthink_transactionReference:reference,
      message: 'Redirect the user to the redirectUrl to complete the payment',
    });
  } catch (error: any) {
    log(`Error in /checkout: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * POST /api/payments/post-callback
 * 
 * Handles the callback from Dropp wallet after user approves the payment.
 * This is the recommended callback method (POST body instead of GET URL params).
 * 
 * Request Body:
 * {
 *   "payer": "0.0.XXXXX",
 *   "invoiceBytes": "base64encodedstring",
 *   "timeStamp": 1700000000000,
 *   "signatures": { "payer": "signature" },
 *   "encodedHHTransfer": "..." (optional),
 *   "distributionBytes": "..." (optional)
 * }
 * 
 * Process:
 * 1. Validate the P2P object
 * 2. Decode invoiceBytes to get the original invoice
 * 3. Verify merchant and payment details
 * 4. Call the Dropp SDK to submit the payment
 * 5. Return the payment response
 */
router.post('/post-callback', (req: Request, res: Response) => {
  try {
    const p2pObj: droppSdk.IPromiseToPay = req.body;

    if (!p2pObj || !p2pObj.invoiceBytes || !p2pObj.payer) {
      return returnError(res, 400, 'Invalid P2P object: missing required fields');
    }

    log(`POST callback received from payer: ${p2pObj.payer}`);

    // Decode the invoice to retrieve payment details
    let invoiceData: IInvoice;
    try {
      invoiceData = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
    } catch (decodeError: any) {
      log(`Failed to decode invoiceBytes: ${decodeError.message}`);
      return returnError(res, 400, 'Invalid invoiceBytes encoding');
    }

    log(`Invoice decoded: ${JSON.stringify(invoiceData)}`);
    log(`Payment details: ${invoiceData.currency} ${invoiceData.amount}, from ${p2pObj.payer} to ${invoiceData.merchantAccount}`);

    // Optional: Verify the checkout exists and matches the invoice
    const merchantId = invoiceData.merchantAccount;
    const checkoutId = invoiceData.qrCodeUUID || (p2pObj as any).checkoutId;

    const checkoutData = checkoutStore[merchantId] ? checkoutStore[merchantId][checkoutId] : null;
    const successCallbackUrl = checkoutData?.successCallbackUrl;
    const failureCallbackUrl = checkoutData?.failureCallbackUrl;

    if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
      checkoutStore[merchantId][checkoutId].status = 'payment_received';
      checkoutStore[merchantId][checkoutId].p2pData = p2pObj;
    }

    // Process the payment using the Dropp SDK
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;

    new droppSdk.DroppPaymentRequest(droppClient)
      .submit(p2pObj, signingKey)
      .then((paymentResponse: droppSdk.DroppResponse) => {
        log(`Payment submitted successfully. Response: ${JSON.stringify(paymentResponse)}`);
        
        // Extract Hedera transaction ID (format: 0.0.XXXXX@171234567890)
        const hederaTxId = extractHederaTransactionId(p2pObj, paymentResponse);
        if (hederaTxId) {
          log(`Hedera Transaction ID: ${hederaTxId}`);
        }
        
        if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
          checkoutStore[merchantId][checkoutId].status = 'completed';
          checkoutStore[merchantId][checkoutId].paymentResponse = paymentResponse;
          if (hederaTxId) {
            checkoutStore[merchantId][checkoutId].hederaTransactionId = hederaTxId;
          }
        }

        // Determine success based on response code
        const isSuccess = paymentResponse.responseCode === 0;
        const redirectUrl = isSuccess ? successCallbackUrl : failureCallbackUrl;

        // If client callback URLs are provided, redirect to appropriate URL
        if (redirectUrl) {
          // Build redirect URL with query parameters for payment status
          const redirectUrlWithParams = new URL(redirectUrl);
          redirectUrlWithParams.searchParams.append('checkoutId', checkoutId);
          redirectUrlWithParams.searchParams.append('status', isSuccess ? 'success' : 'failed');
          redirectUrlWithParams.searchParams.append('reference', invoiceData.reference);
          redirectUrlWithParams.searchParams.append('amount', invoiceData.amount.toString());
          redirectUrlWithParams.searchParams.append('currency', invoiceData.currency);
          redirectUrlWithParams.searchParams.append('payer', p2pObj.payer);
          if (hederaTxId) {
            redirectUrlWithParams.searchParams.append('hederaTransactionId', hederaTxId);
          }

          log(`Redirecting to ${isSuccess ? 'success' : 'failure'} callback URL: ${redirectUrlWithParams.toString()}`);
          return res.redirect(redirectUrlWithParams.toString());
        }

        returnSuccess(res, {
          paymentStatus: paymentResponse.responseCode === 0 ? 'success' : 'failed',
          paymentResponse,
          invoiceData,
          checkoutId,
          hederaTransactionId: hederaTxId || null,
        });
      })
      .catch((paymentError: any) => {
        log(`Payment submission failed: ${JSON.stringify(paymentError)}`);

        if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
          checkoutStore[merchantId][checkoutId].status = 'failed';
          checkoutStore[merchantId][checkoutId].error = paymentError;
        }

         // If client failure callback URL provided, redirect to it
        if (failureCallbackUrl) {
          const redirectUrl = new URL(failureCallbackUrl);
          redirectUrl.searchParams.append('checkoutId', checkoutId);
          redirectUrl.searchParams.append('status', 'failed');
          redirectUrl.searchParams.append('reference', invoiceData.reference);
          redirectUrl.searchParams.append('error', paymentError.message || 'Payment processing failed');

          log(`Redirecting to failure callback URL: ${redirectUrl.toString()}`);
          return res.redirect(redirectUrl.toString());
        }

        // Fallback: return error JSON if no failure callback URL provided
        returnError(res, 500, `Payment processing failed: ${paymentError.message || JSON.stringify(paymentError)}`);
      });
  } catch (error: any) {
    log(`Error in /post-callback: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * GET /api/payments/callback
 * 
 * Alternative callback handler for GET-based callbacks (less recommended due to URL length limits).
 * The wallet will append the p2p object as a URL-encoded query parameter.
 * 
 * Query Parameter:
 * ?p2p=<url-encoded JSON string of P2P object>
 */
router.get('/post-callback', async(req: Request, res: Response) => {
  try {
    const p2pParam = req.query.p2p as string;

    if (!p2pParam) {
      return returnError(res, 400, 'Missing p2p query parameter');
    }

    // Parse the p2p JSON string
    let p2pObj: droppSdk.IPromiseToPay;
    try {
      p2pObj = JSON.parse(p2pParam);
    } catch (parseError: any) {
      return returnError(res, 400, `Invalid p2p JSON: ${parseError.message}`);
    }
    log(`p2p object parsed successfully :: ${JSON.stringify(p2pObj)}`);
    log(`GET callback received from payer: ${p2pObj.payer}`);

    // Decode and process payment (same as POST callback)
    let invoiceData: IInvoice;
    try {
      invoiceData = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
    } catch (decodeError: any) {
      return returnError(res, 400, 'Invalid invoiceBytes encoding');
    }
    log(`Invoice decoded: ${JSON.stringify(invoiceData)}`);
    log(`Payment details: ${invoiceData.currency} ${invoiceData.amount}, from ${p2pObj.payer} to ${invoiceData.merchantAccount} transaction_id: ${invoiceData.reference}  `);

    const merchantId = invoiceData.merchantAccount;
    const checkoutId = invoiceData.qrCodeUUID || (p2pObj as any).checkoutId;
    
    /*
    const checkoutData = checkoutStore[merchantId] ? checkoutStore[merchantId][checkoutId] : null;
    const successCallbackUrl = checkoutData?.successCallbackUrl;
    const failureCallbackUrl = checkoutData?.failureCallbackUrl;
    
    if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
      checkoutStore[merchantId][checkoutId].status = 'payment_received';
      checkoutStore[merchantId][checkoutId].p2pData = p2pObj;
    }
     */

    let successUrl = '';
    let failureUrl = '';
    let signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY;
    try {
      const updateResp = await updateTransactionRecord(invoiceData.reference, {
        p2pData: p2pObj,
        invoiceData: invoiceData,
        payment_status: 'payment_received',
      });
      if (updateResp.ok) {
        successUrl = updateResp.successUrl || '';
        failureUrl = updateResp.failureUrl || '';
        signingKey = updateResp.signingKey || signingKey; 
      } else {
        log('Failed to update checkout details to MongoDB.');
      }
    } catch (dbError) {
      log(`Failed to save payment_received details to MongoDB: ${dbError}`);
    }

    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    //const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    log(`Using signing key: ${signingKey}`);
    new droppSdk.DroppPaymentRequest(droppClient)
      .submit(p2pObj, signingKey)
      .then(async (paymentResponse: droppSdk.DroppResponse) => {
        log(`Payment submitted successfully. Response: ${JSON.stringify(paymentResponse)}`);

        // Extract Hedera transaction ID (format: 0.0.XXXXX@171234567890)
        const hederaTxId = extractHederaTransactionId(p2pObj, paymentResponse);
        if (hederaTxId) {
          log(`Hedera Transaction ID: ${hederaTxId}`);
        }

        /*
        if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
          checkoutStore[merchantId][checkoutId].status = 'completed';
          checkoutStore[merchantId][checkoutId].paymentResponse = paymentResponse;
        }
        */
        
        const isSuccess = paymentResponse.responseCode === 0;
        const redirectUrl = isSuccess ? successUrl : failureUrl;

        if (isSuccess){
          try {
            const updateResp = await updateTransactionRecord(invoiceData.reference, {
              payment_status: 'completed',
              paymentResponse: paymentResponse,
              hederaTransactionId: hederaTxId,
            });
            if (updateResp.ok) {
              log('updated checkout complete to MongoDB.');
            }
          } catch (dbError) {
            log(`Failed to save payment_received details to MongoDB: ${dbError}`);
          }
        }
       
        if (redirectUrl) {
          const redirectUrlWithParams = new URL(redirectUrl);
          redirectUrlWithParams.searchParams.append('checkoutId', checkoutId);
          redirectUrlWithParams.searchParams.append('status', isSuccess ? 'success' : 'failed');
          redirectUrlWithParams.searchParams.append('reference', invoiceData.reference);
          redirectUrlWithParams.searchParams.append('amount', invoiceData.amount.toString());
          redirectUrlWithParams.searchParams.append('currency', invoiceData.currency);
          redirectUrlWithParams.searchParams.append('payer', p2pObj.payer);
          redirectUrlWithParams.searchParams.append('paymentRef', paymentResponse.data.paymentRef);
          redirectUrlWithParams.searchParams.append('transactionReference', paymentResponse.data.transactionReference);
          if (hederaTxId) {
            redirectUrlWithParams.searchParams.append('hederaTransactionId', hederaTxId);
          }

          log(`Redirecting to ${isSuccess ? 'success' : 'failure'} callback URL: ${redirectUrlWithParams.toString()}`);
          return res.redirect(redirectUrlWithParams.toString());
        }

        returnSuccess(res, {
          paymentStatus: paymentResponse.responseCode === 0 ? 'success' : 'failed',
          paymentResponse,
          invoiceData,
          checkoutId,
          hederaTransactionId: hederaTxId || null,
        });
      })
      .catch(async (paymentError: any) => {
        log(`Payment submission failed: ${JSON.stringify(paymentError)}`);
        /*
        if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
          checkoutStore[merchantId][checkoutId].status = 'failed';
          checkoutStore[merchantId][checkoutId].error = paymentError;
        }*/
       
        if (failureUrl) {
          try {
            const updateResp = await updateTransactionRecord(invoiceData.reference, {
              payment_status: 'failed',
              paymentResponse: paymentError,
            });
            if (updateResp.ok) {
              log('updated checkout complete to MongoDB.');
            }
          } catch (dbError) {
            log(`Failed to save payment_received details to MongoDB: ${dbError}`);
          }
          const redirectUrl = new URL(failureUrl);
          redirectUrl.searchParams.append('checkoutId', checkoutId);
          redirectUrl.searchParams.append('status', 'failed');
          redirectUrl.searchParams.append('reference', invoiceData.reference);
          redirectUrl.searchParams.append('error', paymentError.message || 'Payment processing failed');

          log(`Redirecting to failure callback URL: ${redirectUrl.toString()}`);
          return res.redirect(redirectUrl.toString());
        }

        returnError(res, 500, `Payment processing failed: ${paymentError.message || JSON.stringify(paymentError)}`);
      });
  } catch (error: any) {
    log(`Error in /callback: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * GET /api/payments/status/:checkoutId
 * 
 * Optional: Query the status of a checkout
 * 
 * Response:
 * {
 *   "checkoutId": "xxx",
 *   "status": "initiated|payment_received|completed|failed",
 *   "createdAt": "2025-11-11T...",
 *   "paymentDetails": {...},
 *   "paymentResponse": {...} (if completed)
 * }
 */
router.get('/status/:checkoutId', async (req: Request, res: Response) => {
   try {
    const { checkoutId } = req.params;
    const merchantId = (req.query.merchantId as string) || process.env.DROPP_MERCHANT_ID!;

    if (!checkoutId) {
      return returnError(res, 400, 'Missing checkoutId parameter');
    }

    
    // Use Dropp SDK to check payment status for the UUID (waitForCompletion / checkPaymentStatus)
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);

    let statusResponse: any = null;
    try {
      // second param is retry count per README example (adjust as needed)
      statusResponse = await droppClient.waitForCompletion(checkoutId, 3);
      log(`SDK status for ${checkoutId}: ${JSON.stringify(statusResponse)}`);
      switch(statusResponse.data) {
        case 'SUCCESS':
          console.log('Payment completed successfully');
            // Update your database or trigger success actions
          break;
        case 'WAIT':
          console.log('Payment is still pending');
            // Continue monitoring if needed
            //setTimeout(() => checkPaymentStatus(paymentUUID),
            //5000
            //);
          break;
        case 'FAILED':
          console.log('Payment failed');
            // Handle failed payment
          break;
        default:
          console.log('Unknown status:', statusResponse.data);
      }
    } catch (sdkErr: any) {
      log(`SDK checkPaymentStatus failed for ${checkoutId}: ${sdkErr?.message || sdkErr}`);
      return returnError(res, 500, `Failed to get status from SDK: ${sdkErr?.message || sdkErr}`);
      
    }

    // Build response combining SDK result and local store info
    const responsePayload = {
      checkoutId,
      merchantId,
      sdk: statusResponse || null,
      // derive a friendly status if possible
      status: (statusResponse && statusResponse.data) ? statusResponse.data : "unavailable",
    };

    returnSuccess(res, responsePayload);
  } catch (error: any) {
    log(`Error in /status: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});



/**
 * POST /api/payments/verify-hedera
 * 
 * Verify a Dropp payment on Hedera chain directly
 * Accepts the payment proof/transaction ID from the client
 * 
 * Request Body:
 * {
 *   "transactionId": "0.0.XXXXX@171234567890",
 *   "checkoutId": "uuid-xxx" (optional, for linking to checkout)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "verified": true,
 *   "transactionId": "0.0.XXXXX@171234567890",
 *   "data": {...transaction details from Mirror Node...}
 * }
 */
router.post('/verify-hedera', async (req: Request, res: Response) => {
  try {
    const { transactionId, checkoutId } = req.body;

    if (!transactionId) {
      return returnError(res, 400, 'Missing transactionId in request body');
    }

    log(`Hedera verification request for transaction: ${transactionId}, checkoutId: ${checkoutId || 'N/A'}`);

    const verificationResult = await verifyHederaTransaction(transactionId);

    if (!verificationResult.verified) {
      return returnError(res, 400, `Verification failed: ${verificationResult.error}`);
    }

    // If checkoutId provided, update the checkout store with verification result
    if (checkoutId) {
      const merchantId = (req.query.merchantId as string) || process.env.DROPP_MERCHANT_ID!;
      if (checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
        checkoutStore[merchantId][checkoutId].hederaVerified = true;
        checkoutStore[merchantId][checkoutId].hederaTransactionId = transactionId;
        checkoutStore[merchantId][checkoutId].hederaVerificationData = verificationResult.data;
      }
    }

    returnSuccess(res, {
      verified: true,
      transactionId,
      checkoutId: checkoutId || null,
      data: verificationResult.data,
    });
  } catch (error: any) {
    log(`Error in /verify-hedera: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * GET /api/payments/verify-hedera/:transactionId
 * 
 * Verify a Hedera transaction using URL parameter
 * Simpler GET-based endpoint for transaction verification
 * 
 * URL Parameter:
 * /api/payments/verify-hedera/0.0.XXXXX@171234567890
 * 
 * Response:
 * {
 *   "success": true,
 *   "verified": true,
 *   "transactionId": "0.0.XXXXX@171234567890",
 *   "data": {...transaction details from Mirror Node...}
 * }
 */
router.get('/verify-hedera/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return returnError(res, 400, 'Missing transactionId in URL');
    }

    log(`Hedera verification request (GET) for transaction: ${transactionId}`);

    const verificationResult = await verifyHederaTransaction(transactionId);

    if (!verificationResult.verified) {
      return returnError(res, 400, `Verification failed: ${verificationResult.error}`);
    }

    returnSuccess(res, {
      verified: true,
      transactionId,
      data: verificationResult.data,
    });
  } catch (error: any) {
    log(`Error in /verify-hedera/:transactionId: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});

/**
 * GET /api/payments/transactions/:merchantId
 * 
 * Fetch paginated transactions for a merchant using the Dropp SDK.
 * This retrieves all transactions processed by the merchant via Dropp.
 * 
 * URL Parameters:
 * - merchantId: The Hedera account ID of the merchant (e.g., "0.0.123456")
 * 
 * Query Parameters (optional):
 * - offset: Pagination start index (default: 0)
 * - limit: Number of results to return (default: 10, max: 100)
 * 
 * Response:
 * {
 *   "success": true,
 *   "merchantId": "0.0.123456",
 *   "offset": 0,
 *   "limit": 10,
 *   "transactionCount": 10,
 *   "transactions": [...]
 * }
 */
router.get('/transactions/:merchantId', async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 100); // Cap at 100

    if (!merchantId) {
      return returnError(res, 400, 'Missing merchantId parameter');
    }

    log(`Fetching transactions for merchant: ${merchantId}, offset: ${offset}, limit: ${limit}`);

    // Initialize Dropp client and transaction request handler
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const transactionRequest = new droppSdk.DroppTransactionRequest(droppClient);

    // Prepare request parameters
    const requestParameters = {
      userId: merchantId, // Merchant account ID
      offset: offset,
      limit: limit,
    };

    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    const parentMerchantAccountId = process.env.DROPP_MERCHANT_ID!; // Parent merchant ID

    log(`Transaction request parameters: ${JSON.stringify(requestParameters)}`);

    // Call Dropp SDK to fetch transactions
    // Signature: getTransactions(requestParameters, parentMerchantAccountId, signingKey)
    const response = await transactionRequest.getTransactions(requestParameters, parentMerchantAccountId, signingKey);

    log(`Dropp transaction response: ${JSON.stringify(response)}`);

    if (!response || response.responseCode !== 0) {
      log(`Failed to fetch transactions from Dropp: ${JSON.stringify(response)}`);
      return returnError(res, 500, `Failed to fetch transactions: ${response?.errors?.[0] || 'Unknown error'}`);
    }

    // Extract transaction list from response
    const transactions = response.data || [];

    returnSuccess(res, {
      merchantId,
      offset,
      limit,
      transactionCount: transactions.length,
      transactions,
    });
  } catch (error: any) {
    log(`Error in /transactions/:merchantId: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});

export default router;

// Debug endpoint: GET /api/payments/debug/:uuid
// Returns the SDK status for a UUID to help inspect what payment options/back-end data exist for the generated checkout.
router.get('/debug/:uuid', async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;
    if (!uuid) return returnError(res, 400, 'Missing uuid parameter');

    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    // Use a single poll attempt to fetch status/details for the uuid
    const status = await droppClient.waitForCompletion(uuid, 1);
    returnSuccess(res, { uuid, status });
  } catch (err: any) {
    log(`Error in /debug/:uuid - ${err?.message || err}`);
    returnError(res, 500, err?.message || 'Internal server error');
  }
});

/**
 * POST /api/payments/debug/decode-transfer
 *
 * Debug helper to decode Dropp's `encodedHHTransfer` base64 payload or a provided base64 string.
 * Accepts JSON body: { encodedHHTransfer?: string, p2pObj?: object }
 * If the decoded payload is JSON, returns the parsed object; otherwise returns the decoded string.
 */
router.post('/debug/decode-transfer', async (req: Request, res: Response) => {
  try {
    const { encodedHHTransfer, p2pObj } = req.body || {};

    let b64: string | undefined = encodedHHTransfer;
    if (!b64 && p2pObj && typeof p2pObj === 'object') {
      b64 = p2pObj.encodedHHTransfer;
    }

    if (!b64) {
      return returnError(res, 400, 'Missing encodedHHTransfer in body or p2pObj.');
    }

    // Attempt to decode base64
    let decoded: any = null;
    try {
      const buf = Buffer.from(b64, 'base64');
      const asString = buf.toString('utf8');
      try {
        decoded = JSON.parse(asString);
      } catch (_) {
        decoded = asString; // plain string
      }
    } catch (err: any) {
      log(`Failed to decode base64 encodedHHTransfer: ${err?.message || err}`);
      return returnError(res, 400, 'Invalid base64 in encodedHHTransfer');
    }

    log('Decoded encodedHHTransfer for debug:');
    try { log(JSON.stringify(decoded)); } catch { log(String(decoded)); }

    returnSuccess(res, { decoded, raw: b64 });
  } catch (err: any) {
    log(`Error in /debug/decode-transfer: ${err?.message || err}`);
    returnError(res, 500, err?.message || 'Internal server error');
  }
});