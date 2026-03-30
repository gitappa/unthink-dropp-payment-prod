import { Router, Request, Response } from 'express';
import http, { get, IncomingMessage, ServerResponse } from 'http';
import * as droppSdk from '../../dropp-sdk-js';
import { IInvoice } from '../../dropp-sdk-js/dropp-payloads';
import { DroppRedemptionData } from '../../dropp-sdk-js/dropp-redemption-data';
import { TransactionService, HederaService, CommonService, PaymentCallbackService, CheckoutService } from '../middleware/utils';
import { getNetworkMembersApi } from '../../network-members';
import { inspect } from 'util';
type Res = ServerResponse<IncomingMessage>;
const router = Router();

// In-memory store for checkout mappings (merchantId -> checkoutId -> paymentDetails)
// In production, use a database like MongoDB, PostgreSQL, etc.
const checkoutStore: Record<string, Record<string, any>> = {};


function log(message: string): void {
  console.log(`[PAYMENT-ROUTES] - ${message}`);
}

function formatError(error: any): string {
  const details =
    error?.response?.data ||
    error?.response ||
    error?.data ||
    error?.request ||
    error;

  return inspect(details, { depth: 8, colors: false });
}

function getErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
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
    log(`req.protocol: ${req.protocol}, req.get('host'): ${req.get('host')}`);
    //-------------------Validate required fields------------
    let valid_details = await CommonService.checkoutValidator(req, res);
    let merchantAccount = req.body.merchantAccount || process.env.DROPP_MERCHANT_ID!;
    let referrer_1_Account = req.body.referrer_1_Account || process.env.DROPP_REFERRER_1_ACCOUNT_ID || '';
    let referrer_2_Account = req.body.referrer_2_Account || process.env.DROPP_REFERRER_2_ACCOUNT_ID || '';
    if (valid_details.isValid) {
      let {
        amount,
        currency = 'USD',
        user_id,
        store_id,
        emailId = '',
        service_id = '',
        thumbnail,
        signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY,
        platform_distribution_share,
        referrer_1_distribution_share,
        referrer_2_distribution_share,
        successUrl,
        failureUrl,
        title,
        type,
        successMessage,
        purchaseExpiration,
        referralFee,
        referralAccount,
        acceptPaymentDelay,
        noOffers,
        payByCC = true,
        payByBank = true,
      } = req.body;
      if(!req.body.type){
        if(platform_distribution_share || referrer_1_distribution_share || referrer_2_distribution_share){
          type = 'merchant_distribution_payment';
        }else{
          type = 'single_payment';
        }
      } 
     
      //------------------handle distribution and get correct merchant account for single payment flow with referrer details----------------
      if(!req.body.merchantAccount && (req.body.referrer_1_Account || req.body.referrer_2_Account)){
        if(referrer_1_distribution_share && referrer_2_distribution_share){
          platform_distribution_share = 100 - (referrer_1_distribution_share + referrer_2_distribution_share);
        }else if(referrer_1_distribution_share){  
          platform_distribution_share = 100 - referrer_1_distribution_share;
        }else if(referrer_2_distribution_share){
          platform_distribution_share = 100 - referrer_2_distribution_share;
        }
        if(req.body.referrer_1_Account){
          merchantAccount = req.body.referrer_1_Account;
          referrer_1_Account = '';
          referrer_1_distribution_share = 0;
        }else if(req.body.referrer_2_Account){
          merchantAccount = req.body.referrer_2_Account;
          referrer_2_Account = '';
          referrer_2_distribution_share = 0;
        } 
      }
      //-----------------get correct callback url for single payment or submerchant payment handler------------
      log(`merchantAccount: ${merchantAccount}, referrer_1_Account: ${referrer_1_Account}, referrer_2_Account: ${referrer_2_Account}, platform_distribution_share: ${platform_distribution_share}, referrer_1_distribution_share: ${referrer_1_distribution_share}, referrer_2_distribution_share: ${referrer_2_distribution_share}`);
      var getCallbackUrl_details = await CommonService.getCallbackUrl(req, platform_distribution_share, referrer_1_distribution_share, referrer_2_distribution_share, referrer_1_Account, referrer_2_Account);
      log(`Using callback URL: ${getCallbackUrl_details.callbackUrl}`);
      log(`Using distribution: ${JSON.stringify(getCallbackUrl_details.distribution)}`);

      //------------------Construct description with additional details-----------------------
      let buildCustomDescription_details = await CommonService.buildCustomDescription(req, res);
      let description = buildCustomDescription_details.description;
      let additional_details = buildCustomDescription_details.additional_details;

      //-----------------Build checkout input using shared service---------------------------------
      const checkoutInput = {
        merchantAccount, signingKey, amount, currency, user_id, store_id,
        emailId, service_id, thumbnail, successUrl, failureUrl, title, type,
        successMessage, purchaseExpiration, referralFee, referralAccount,
        acceptPaymentDelay, noOffers, payByCC, payByBank,
        platform_distribution_share, referrer_1_distribution_share,
        referrer_2_distribution_share, 
        callbackUrl: getCallbackUrl_details.callbackUrl,
        distribution: getCallbackUrl_details.distribution,
        description, additional_details,
      };

      //-----------------Create transaction record---------------------------------
      const createTransactionData = CheckoutService.buildTransactionData(checkoutInput);
      let reference: string;
      try {
        reference = await CheckoutService.createTransaction(createTransactionData);
      } catch (err: any) {
        log(`Failed to create transaction: ${err.message}`);
        return returnError(res, 500, err.message);
      }

      log(`Checkout request received for merchant ${merchantAccount}, description:: ${description}  type desc :${typeof(description)} amount: ${amount} ${currency}, reference: ${reference}`);

      //---------------------construct payment request payload & generate UUID-----------------------
      const paymentPayload = CheckoutService.buildPaymentPayload({ ...checkoutInput, reference });
      log(`Payment request payload constructed: ${JSON.stringify(paymentPayload)}`);

      let checkoutId: string;
      let qrCodeUrl: string;
      try {
        ({ checkoutId, qrCodeUrl } = await CheckoutService.generateCheckoutUUID(paymentPayload));
      } catch (uuidError: any) {
        log(`Error generating UUID: ${uuidError.message}`);
        return returnError(res, 500, uuidError.message);
      }

      //----------update transaction with checkout details-------------
      try {
        await CheckoutService.updateTransactionWithCheckout(reference, checkoutId, qrCodeUrl, additional_details, getCallbackUrl_details.distribution);
      } catch (dbError) {
        log(`Failed to save checkout details to MongoDB: ${dbError}`);
      }

      returnSuccess(res, CheckoutService.buildCheckoutResponse(checkoutId, qrCodeUrl, reference));
    }else{
      return returnError(res, 400, valid_details.message);
    }
  } catch (error: any) {
    log(`Error in /checkout: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});
 
router.post('/user_checkout', async (req: Request, res: Response) => {
  log(`Received /user_checkout request process.env.DROPP_MERCHANT_ID ${process.env.DROPP_MERCHANT_ID}`);
  try {
    log(`req.protocol: ${req.protocol}, req.get('host'): ${req.get('host')}`);
    //-------------------Validate required fields------------
    let valid_details = await CommonService.userCheckoutValidator(req, res);
    let userMerchantAccount = req.body.userMerchantAccount;
    let merchantAccount = process.env.DROPP_MERCHANT_ID!;
    let user_merchant_share = 0;
    if (valid_details.isValid) {
      let {
        amount,
        currency = 'USD',
        user_id,
        store_id,
        emailId = '',
        service_id = '',
        thumbnail,
        signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY,
        platform_distribution_share,
        referrer_1_distribution_share,
        referrer_2_distribution_share,
        successUrl,
        failureUrl,
        title,
        type,
        successMessage,
        purchaseExpiration,
        referralFee,
        referralAccount,
        acceptPaymentDelay,
        noOffers,
        payByCC = true,
        payByBank = true,
      } = req.body;
     
      if(platform_distribution_share){
        type = 'platform_distribution_payment';
        user_merchant_share = 100 - platform_distribution_share;
      }
      log(`merchantAccount: ${merchantAccount}, userMerchantAccount: ${userMerchantAccount}, platform_distribution_share: ${platform_distribution_share}, referrer_1_distribution_share: ${referrer_1_distribution_share}, referrer_2_distribution_share: ${referrer_2_distribution_share}, user_merchant_share: ${user_merchant_share}`);

      const callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/post-callback-with-redeem`;

      //------------------Construct description with additional details-----------------------
      let buildCustomDescription_details = await CommonService.buildCustomDescription(req, res);
      let description = buildCustomDescription_details.description;
      let additional_details = buildCustomDescription_details.additional_details;

      //-----------------Build checkout input using shared service---------------------------------
      const checkoutInput = {
        merchantAccount, userMerchantAccount, signingKey,
        amount, currency, user_id, store_id,
        emailId, service_id, thumbnail, successUrl, failureUrl, title, type,
        successMessage, purchaseExpiration, referralFee, referralAccount,
        acceptPaymentDelay, noOffers, payByCC, payByBank,
        platform_distribution_share, referrer_1_distribution_share,
        referrer_2_distribution_share, user_merchant_share,
        callbackUrl,
        description, additional_details,
      };

      //-----------------Create transaction record---------------------------------
      const createTransactionData = CheckoutService.buildTransactionData(checkoutInput);
      let reference: string;
      try {
        reference = await CheckoutService.createTransaction(createTransactionData);
      } catch (err: any) {
        log(`Failed to create transaction: ${err.message}`);
        return returnError(res, 500, err.message);
      }

      log(`Checkout request received for merchant ${merchantAccount}, description:: ${description}  type desc :${typeof(description)} amount: ${amount} ${currency}, reference: ${reference}`);

      //---------------------construct payment request payload & generate UUID-----------------------
      const paymentPayload = CheckoutService.buildPaymentPayload({ ...checkoutInput, reference });
      log(`Payment request payload constructed: ${JSON.stringify(paymentPayload)}`);

      let checkoutId: string;
      let qrCodeUrl: string;
      try {
        ({ checkoutId, qrCodeUrl } = await CheckoutService.generateCheckoutUUID(paymentPayload));
      } catch (uuidError: any) {
        log(`Error generating UUID: ${uuidError.message}`);
        return returnError(res, 500, uuidError.message);
      }

      //----------update transaction with checkout details-------------
      try {
        await CheckoutService.updateTransactionWithCheckout(reference, checkoutId, qrCodeUrl, additional_details);
      } catch (dbError) {
        log(`Failed to save checkout details to MongoDB: ${dbError}`);
      }

      returnSuccess(res, CheckoutService.buildCheckoutResponse(checkoutId, qrCodeUrl, reference));
    }else{
      return returnError(res, 400, valid_details.message);
    }
  } catch (error: any) {
    log(`Error in /user_checkout: ${error.message}`);
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
        const hederaTxId = HederaService.extractTransactionId(p2pObj, paymentResponse);
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
        const errorMessage = getErrorMessage(paymentError);
        const errorPayload = paymentError?.response?.data || paymentError?.data || paymentError;

        log(`Payment submission failed (message): ${errorMessage}`);
        log(`Payment submission failed (payload): ${formatError(errorPayload)}`);

        if (checkoutId && checkoutStore[merchantId] && checkoutStore[merchantId][checkoutId]) {
          checkoutStore[merchantId][checkoutId].status = 'failed';
          checkoutStore[merchantId][checkoutId].error = errorPayload;
        }

         // If client failure callback URL provided, redirect to it
        if (failureCallbackUrl) {
          const redirectUrl = new URL(failureCallbackUrl);
          redirectUrl.searchParams.append('checkoutId', checkoutId);
          redirectUrl.searchParams.append('status', 'failed');
          redirectUrl.searchParams.append('reference', invoiceData.reference);
          redirectUrl.searchParams.append('error', errorMessage);

          log(`Redirecting to failure callback URL: ${redirectUrl.toString()}`);
          return res.redirect(redirectUrl.toString());
        }

        // Fallback: return error JSON if no failure callback URL provided
        returnError(res, 500, `Payment processing failed: ${errorMessage}`);
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
router.get('/post-callback-v1', async(req: Request, res: Response) => {
  try {
    const p2pParam = req.query.p2p as string;

    //-------- Parse & decode p2p + invoice using shared util --------
    let parsed;
    try {
      parsed = PaymentCallbackService.parseCallbackQuery(p2pParam);
    } catch (parseErr: any) {
      return returnError(res, parseErr.statusCode || 400, parseErr.message);
    }
    const { p2pObj, invoiceData, checkoutId, merchantId } = parsed;

    log(`Distribution in invoiceData: ${JSON.stringify(invoiceData.distribution)}`);
    log(`DistributionBytes in p2pObj: ${p2pObj.distributionBytes}`);

    //-------- Mark payment_received and retrieve stored URLs / keys --------
    const { successUrl, failureUrl, signingKey } = await PaymentCallbackService.markPaymentReceived(
      invoiceData.reference, p2pObj, invoiceData
    );

    //-------- Submit payment via shared util --------
    try {
      const result = await PaymentCallbackService.submitPayment(p2pObj, signingKey);

      //-------- Update transaction in MongoDB --------
      await PaymentCallbackService.updateTransactionAfterPayment(invoiceData.reference, result);

      const redirectUrl = result.isSuccess ? successUrl : failureUrl;

      if (redirectUrl) {
        const fullUrl = PaymentCallbackService.buildRedirectUrl(redirectUrl, {
          checkoutId,
          isSuccess: result.isSuccess,
          reference: invoiceData.reference,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          payer: p2pObj.payer,
          paymentRef: result.paymentRef,
          transactionReference: result.transactionReference,
          hederaTxId: result.hederaTxId,
          receiptURL: result.receiptURL,
        });
        log(`Redirecting to ${result.isSuccess ? 'success' : 'failure'} callback URL: ${fullUrl}`);
        return res.redirect(fullUrl);
      }

      returnSuccess(res, {
        paymentStatus: result.isSuccess ? 'success' : 'failed',
        paymentResponse: result.paymentResponse,
        invoiceData,
        checkoutId,
        hederaTransactionId: result.hederaTxId || null,
        receiptURL: result.receiptURL || null,
      });
    } catch (paymentError: any) {
      const errorMessage = getErrorMessage(paymentError);
      log(`Payment submission failed: ${formatError(paymentError)}`);

      await PaymentCallbackService.updateTransactionOnError(invoiceData.reference, paymentError);

      if (failureUrl) {
        const fullUrl = PaymentCallbackService.buildRedirectUrl(failureUrl, {
          checkoutId,
          isSuccess: false,
          reference: invoiceData.reference,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          payer: p2pObj.payer,
          errorMessage,
        });
        log(`Redirecting to failure callback URL: ${fullUrl}`);
        return res.redirect(fullUrl);
      }

      returnError(res, 500, `Payment processing failed: ${errorMessage}`);
    }
  } catch (error: any) {
    log(`Error in /callback: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});


/**
 * GET /api/payments/post-callback-with-redeem
 *
 * Same flow as post-callback-v1, but after a successful payment to the platform,
 * automatically redeems (credit-pays) the user merchant's distribution share
 * to their wallet.
 *
 * Used when type = 'platform_distribution_payment': the payer pays 100 % to the
 * platform merchant, then this handler pays the user merchant their share
 * via DroppCreditPaymentRequest.
 *
 * Query Parameter:
 * ?p2p=<url-encoded JSON string of P2P object>
 */
router.get('/post-callback-with-redeem', async (req: Request, res: Response) => {
  try {
    const p2pParam = req.query.p2p as string;

    //-------- Parse & decode p2p + invoice using shared util --------
    let parsed: any
    try {
      parsed = PaymentCallbackService.parseCallbackQuery(p2pParam);
    } catch (parseErr: any) {
      return returnError(res, parseErr.statusCode || 400, parseErr.message);
    }
    const { p2pObj, invoiceData, checkoutId, merchantId } = parsed;

    log(`[post-callback-with-redeem] Distribution in invoiceData: ${JSON.stringify(invoiceData.distribution)}`);

    //-------- Mark payment_received and retrieve stored URLs / keys / user share --------
    const {
      successUrl,
      failureUrl,
      signingKey,
      user_merchant_share,
      userMerchantAccount,
      user_id,
      service_id,
      store_id,
      emailId,
      title,
      description,

    } = await PaymentCallbackService.markPaymentReceived(
      invoiceData.reference, p2pObj, invoiceData
    );

    //-------- Submit the primary payment to the platform merchant --------
    try {
      const result = await PaymentCallbackService.submitPayment(p2pObj, signingKey);

      //-------- Update main transaction in MongoDB --------
      await PaymentCallbackService.updateTransactionAfterPayment(invoiceData.reference, result);
      log(`[post-callback-with-redeem] Payment submission result: ${JSON.stringify(result)}`);

      //-------- If payment succeeded, redeem user's share --------
      let redeemResult: { success: boolean; redeemResponse?: any; error?: string } | null = null;

      if (result.isSuccess && user_merchant_share > 0 && userMerchantAccount) {
        const userAmount = Number(((Number(invoiceData.amount) * user_merchant_share) / 100).toFixed(4));
        log(`[post-callback-with-redeem] Initiating redeem payout: ${user_merchant_share}% of ${invoiceData.amount} ${invoiceData.currency} → ${userAmount} to ${userMerchantAccount}`);

        redeemResult = await PaymentCallbackService.processRedeem({
          userMerchantAccount: userMerchantAccount,
          amount: userAmount,
          currency: invoiceData.currency,
          creditReference: `Payout for ${invoiceData.reference}`,
          meta: {
            type: 'user_payout',
            user_id,
            service_id,
            store_id,
            emailId,
            title,
            description,
          },
        });

        // Update main transaction with redeem status
        try {
          await TransactionService.update(invoiceData.reference, {
            redeem_status: redeemResult.success ? 'completed' : 'failed',
            redeem_response: redeemResult.redeemResponse || redeemResult.error,
            user_merchant_share,
            userMerchantAccount,      
          });
        } catch (dbError) {
          log(`Failed to update redeem status in MongoDB: ${dbError}`);
        }
      } else if (result.isSuccess) {
        log(`[post-callback-with-redeem] No user redeem needed (share: ${user_merchant_share}, account: ${userMerchantAccount})`);
      }

      //-------- Redirect or respond --------
      const redirectUrl = result.isSuccess ? successUrl : failureUrl;

      if (redirectUrl) {
        const fullUrl = PaymentCallbackService.buildRedirectUrl(redirectUrl, {
          checkoutId,
          isSuccess: result.isSuccess,
          reference: invoiceData.reference,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          payer: p2pObj.payer,
          paymentRef: result.paymentRef,
          transactionReference: result.transactionReference,
          hederaTxId: result.hederaTxId,
          receiptURL: result.receiptURL,
        });
        log(`Redirecting to ${result.isSuccess ? 'success' : 'failure'} callback URL: ${fullUrl}`);
        return res.redirect(fullUrl);
      }

      returnSuccess(res, {
        paymentStatus: result.isSuccess ? 'success' : 'failed',
        paymentResponse: result.paymentResponse,
        invoiceData,
        checkoutId,
        hederaTransactionId: result.hederaTxId || null,
        receiptURL: result.receiptURL || null,
        redeemPayout: redeemResult || null,
      });
    } catch (paymentError: any) {
      const errorMessage = getErrorMessage(paymentError);
      log(`[post-callback-with-redeem] Payment submission failed: ${formatError(paymentError)}`);

      await PaymentCallbackService.updateTransactionOnError(invoiceData.reference, paymentError);

      if (failureUrl) {
        const fullUrl = PaymentCallbackService.buildRedirectUrl(failureUrl, {
          checkoutId,
          isSuccess: false,
          reference: invoiceData.reference,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          payer: p2pObj.payer,
          errorMessage,
        });
        log(`Redirecting to failure callback URL: ${fullUrl}`);
        return res.redirect(fullUrl);
      }

      returnError(res, 500, `Payment processing failed: ${errorMessage}`);
    }
  } catch (error: any) {
    log(`Error in /post-callback-with-redeem: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});


/**
 * GET /api/payments/post-callback1
 * 
 * Alternative callback handler for GET-based callbacks with sub-merchant support.
 * Checks for distribution data and uses submitForSubMerchant if present.
 * The wallet will append the p2p object as a URL-encoded query parameter.
 * 
 * Query Parameter:
 * ?p2p=<url-encoded JSON string of P2P object>
 */
router.get('/post-callback-v2', async(req: Request, res: Response) => {
  try {
    const p2pParam = req.query.p2p as string;

    //-------- Parse & decode p2p + invoice using shared util --------
    let parsed;
    try {
      parsed = PaymentCallbackService.parseCallbackQuery(p2pParam);
    } catch (parseErr: any) {
      return returnError(res, parseErr.statusCode || 400, parseErr.message);
    }
    const { p2pObj, invoiceData, checkoutId, merchantId } = parsed;

    log(`Distribution in invoiceData: ${JSON.stringify(invoiceData.distribution)}`);
    log(`DistributionBytes in p2pObj: ${p2pObj.distributionBytes}`);

    //-------- Mark payment_received and retrieve stored URLs / keys --------
    const { successUrl, failureUrl, signingKey } = await PaymentCallbackService.markPaymentReceived(
      invoiceData.reference, p2pObj, invoiceData
    );

    //-------- Submit payment (with sub-merchant distribution support) --------
    try {
      const result = await PaymentCallbackService.submitPaymentWithDistribution(p2pObj, signingKey, invoiceData);

      //-------- Update transaction in MongoDB --------
      await PaymentCallbackService.updateTransactionAfterPayment(invoiceData.reference, result);

      const redirectUrl = result.isSuccess ? successUrl : failureUrl;

      if (redirectUrl) {
        const fullUrl = PaymentCallbackService.buildRedirectUrl(redirectUrl, {
          checkoutId,
          isSuccess: result.isSuccess,
          reference: invoiceData.reference,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          payer: p2pObj.payer,
          paymentRef: result.paymentRef,
          transactionReference: result.transactionReference,
          hederaTxId: result.hederaTxId,
          receiptURL: result.receiptURL,
        });
        log(`Redirecting to ${result.isSuccess ? 'success' : 'failure'} callback URL: ${fullUrl}`);
        return res.redirect(fullUrl);
      }

      returnSuccess(res, {
        paymentStatus: result.isSuccess ? 'success' : 'failed',
        paymentResponse: result.paymentResponse,
        invoiceData,
        checkoutId,
        hederaTransactionId: result.hederaTxId || null,
        receiptURL: result.receiptURL || null,
      });
    } catch (paymentError: any) {
      const errorMessage = getErrorMessage(paymentError);
      log(`Payment submission failed: ${formatError(paymentError)}`);

      await PaymentCallbackService.updateTransactionOnError(invoiceData.reference, paymentError);

      if (failureUrl) {
        const fullUrl = PaymentCallbackService.buildRedirectUrl(failureUrl, {
          checkoutId,
          isSuccess: false,
          reference: invoiceData.reference,
          amount: invoiceData.amount,
          currency: invoiceData.currency,
          payer: p2pObj.payer,
          errorMessage,
        });
        log(`Redirecting to failure callback URL: ${fullUrl}`);
        return res.redirect(fullUrl);
      }

      returnError(res, 500, `Payment processing failed: ${errorMessage}`);
    }
  } catch (error: any) {
    log(`Error in /post-callback-v2: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});


/*
  GET /api/payments/network-members
  // Fetch network members for a merchant within a time range. Query parameters:
  //   from (string, timestamp) - start of range (required)
  //   to   (string, timestamp) - end of range (required)
  //   offset (number, optional)
  //   limit  (number, optional, max 100)
  */
router.get('/network-members', async (req: Request, res: Response) => {
  try {
    // Extract and normalize query values; convert numeric timestamps or loose strings to ISO
    const rawFrom = (req.query.from as string) || '';
    const rawTo = (req.query.to as string) || '';
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : undefined;
    // helper to convert a value to an ISO string if possible
    function normalizeTime(val: string): string | undefined {
      if (!val) return undefined;
      const lower = val.toLowerCase();
      if (lower === 'undefined' || lower === 'null') {
        return undefined;
      }
      const asNum = Number(val);
      if (!isNaN(asNum) && val.trim() !== '') {
        const d = new Date(asNum);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      }
      const d2 = new Date(val);
      if (!isNaN(d2.getTime())) {
        return d2.toISOString();
      }
      // fall back to original string if it at least looks like a non-empty value
      return val;
    }

    const from = normalizeTime(rawFrom);
    const to = normalizeTime(rawTo);

    if (!from || !to) {
      returnError(res, 400, 'from and to query parameters are required and must be valid dates');
      return;
    }

    const requestPayload: any = {
      from,
      to,
      offset,
      limit,
    };
    
    getNetworkMembersApi(requestPayload, res, (returnValue: any, resObj: Res) => {
      if (returnValue && returnValue.responseCode === 0) {
        returnSuccess(res, returnValue);
      } else {
        const msg = returnValue?.error || 'Failed to fetch network members';
        returnError(res, 500, msg);
      }
    });
  } catch (error: any) {
    log(`Error in /network-members: ${error.message}`);
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

    const verificationResult = await HederaService.verifyHederaTransaction(transactionId);

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

router.post('/get-authorize-url', async (req: Request, res: Response) => {
  try {
    const { user_id, emailId } = req.body;

    if (!(user_id || emailId)) {
      return returnError(res, 400, 'Missing user_id or emailId');
    }

    log(`Generating authorize URL for user: ${user_id}`);

    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const parentMerchantId = process.env.DROPP_PARENT_MERCHANT_ID || process.env.DROPP_MERCHANT_ID!;
    //const myCallbackUrl = `${req.protocol}://${req.get('host')}/api/payments/authorize-callback`;
    try {
      // Get the authorization URL from Dropp SDK
      const authorizeUrl = droppClient.getUrlForSubMerchantAuthorization(parentMerchantId);
      
      log(`Authorization URL generated: ${authorizeUrl}`);

      // Store session mapping (user_id -> state, for security)
      const sessionId = `session_${user_id}_${Date.now()}`;
      checkoutStore[user_id] = checkoutStore[user_id] || {};
      checkoutStore[user_id][sessionId] = {
        status: 'pending_authorization',
        email: emailId,
        createdAt: new Date().toISOString(),
      };

      log(`Session created: ${sessionId} for user: ${user_id}`);

      returnSuccess(res, {
        success: true,
        authorizeUrl: authorizeUrl,
        sessionId: sessionId,
      });
    } catch (sdkError: any) {
      log(`Failed to get authorization URL: ${sdkError.message}`);
      return returnError(res, 500, `Failed to get authorization URL: ${sdkError.message}`);
    }
  } catch (error: any) {
    log(`Error in /get-authorize-url: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});


/**
 * POST /api/payments/redeem
 * 
 * Redeem credits to a user's wallet. Reference: index.ts processRedemption.
 * 
 * Request Body:
 * {
 *   "userMerchantAccount": "0.0.XXXXXX",
 *   "amount": 1.00,
 *   "currency": "USD",            (optional, defaults to "USD")
 *   "creditReference": "reason"    (optional, defaults to "Credit redemption")
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "paymentResponse": {...DroppResponse}
 * }
 */
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const { userMerchantAccount, amount, currency, creditReference, user_id, emailId, store_id, service_id, title, description } = req.body;

    if (!userMerchantAccount || amount === undefined || amount === null || amount === '') {
      return returnError(res, 400, 'Missing required fields: userMerchantAccount, amount');
    }

    const result = await PaymentCallbackService.processRedeem({
      userMerchantAccount,
      amount: Number(amount),
      currency,
      creditReference,
      ipAddress: req.ip || '127.0.0.1',
      meta: {
        user_id: user_id || userMerchantAccount,
        service_id: service_id || '',
        store_id: store_id || '',
        emailId: emailId || '',
        type: 'redeem',
        title : title ,
        description : description,
      },
    });

    if (result.success) {
      returnSuccess(res, { paymentResponse: result.redeemResponse, unthink_transactionReference: result.reference });
    } else {
      returnError(res, 500, result.error || 'Redeem failed');
    }
  } catch (error: any) {
    log(`Error in /redeem: ${error.message}`);
    returnError(res, 500, error.message || 'Internal server error');
  }
});


const activeSessions = new Map<string, any>();

export default router;