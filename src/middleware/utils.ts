import axios from 'axios';
import dotenv from 'dotenv';
import http, { get, IncomingMessage, ServerResponse } from 'http';
import * as droppSdk from '../../dropp-sdk-js';
import { IInvoice } from '../../dropp-sdk-js/dropp-payloads';
import { DroppRedemptionData } from '../../dropp-sdk-js/dropp-redemption-data';
import { inspect } from 'util';
import { use } from 'react';
import { title } from 'process';
// Load environment variables
dotenv.config();
type Res = ServerResponse<IncomingMessage>;
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
  try { return JSON.stringify(error); } catch { return String(error); }
}
const TRANSACTION_BASE_URL = process.env.DJANGO_BASE_URL + 'transactions';
log(`DJANGO_BASE_URL: ${process.env.DJANGO_BASE_URL}`);
log(`Transaction Base URL: ${TRANSACTION_BASE_URL}`);

// ============ Transaction Class ============
export class TransactionService {
  static async create(payload: any) {
    try {
      const resp = await axios.post(`${TRANSACTION_BASE_URL}/create_transaction/`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
    const ok = resp?.data?.status_code === 200;
    return { ok, raw: resp.data, data: resp.data?.data ?? null };
    } catch (err: any) {
      console.error(`[utils] createTransactionRecord error: ${err?.message || err}`);
      return { ok: false, raw: err, data: null };
    }
  }

  static async update(transactionId: string, payload: any) {
  try {
    const body = Object.assign({ transaction_id: transactionId }, payload);
    const resp = await axios.put(`${TRANSACTION_BASE_URL}/update_transaction/`, body, {
      headers: { 'Content-Type': 'application/json' },
    });

    const ok = resp?.data?.status_code === 200;
    return {
      ok,
      raw: resp.data,
      data: resp.data?.data ?? null,
      successUrl: resp.data?.data?.successUrl ?? '',
      failureUrl: resp.data?.data?.failureUrl ?? '',
      signingKey: resp.data?.data?.signingKey ?? '',
      merchantId: resp.data?.data?.merchantId ?? '',
      user_merchant_share: resp.data?.data?.user_merchant_share ?? 0,
      };
    } catch (err: any) {
      console.error(`[utils] updateTransactionRecord error for ${transactionId}: ${err?.message || err}`);
      return { ok: false, raw: err, data: null, successCallbackUrl: '', failureCallbackUrl: '' };
    }
  }

}

// ============ Hedera Class ============
export class HederaService {
  /**
   * Helper function to verify a Hedera transaction on-chain
   * Uses Hedera Mirror Node (read-only, free) to validate transaction receipt
   * 
   * Accepts two types of identifiers:
   * 1. Hedera Transaction ID: "0.0.XXXXX@171234567890" format
   * 2. Payment reference: hex string or UUID (falls back to payment verification)
   * https://testnet.mirrornode.hedera.com/api/v1/transactions/0.0.2009-1766056281-854000955
   */
  static async verifyHederaTransaction(txIdString: string) {
    const axios = require('axios');
    const MIRROR_NODE_URL = process.env.HEDERA_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com/api/v1';
    //https://testnet.mirrornode.hedera.com/api/v1
    //https://mainnet-public.mirrornode.hedera.com/api/v1
    try {
      // Detect if this is a Hedera Transaction ID or a payment reference
      const isHederaTxId = txIdString.includes('@') && txIdString.includes('.');
      
      if (!isHederaTxId) {
        // This is a payment reference (paymentRef), not a Hedera TX ID
        log(`Note: Provided ID is not a Hedera Transaction ID format. Treating as payment reference: ${txIdString}`);
        return {
          verified: true,
          error: null,
          type: 'payment_reference',
          data: {
            paymentReference: txIdString,
            timestamp: new Date().toISOString(),
            note: 'Payment reference recorded. For full on-chain verification, a Hedera Transaction ID (0.0.XXXXX@timestamp) is needed.',
          },
        };
      }
      
      // Format TxID: "0.0.123@171..." -> "0.0.123-171..." for Mirror Node API
      const formattedId = txIdString.replace(/@/g, '-').replace(/\./g, '-');
      
      // Call Mirror Node (Read-only, Free)
      const url = `${MIRROR_NODE_URL}/transactions/${formattedId}`;
      log(`Verifying Hedera transaction: ${txIdString} (formatted: ${formattedId})`);
      log(`Mirror Node URL: ${url}`);
      const response = await axios.get(url);
      log(`Mirror Node response: ${JSON.stringify(response)}`);
      const transactionData = response.data;
      log(`Transaction data: ${JSON.stringify(transactionData)}`);

      if (!transactionData || !transactionData.transactions || transactionData.transactions.length === 0) {
        log(`Transaction not found on Hedera: ${txIdString}`);
        return { verified: false, error: 'Transaction not found on Hedera', data: null };
      }

      const transaction = transactionData.transactions[0];
      log(`Transaction data retrieved: ${JSON.stringify(transaction)}`);
      const receipt = transaction.receipt;
      log(`Transaction receipt: ${JSON.stringify(receipt)}`);
      // Verify the transaction was successful (status = SUCCESS)
      if (receipt?.status !== 'SUCCESS') {
        log(`Transaction failed on Hedera: ${txIdString}, status: ${receipt?.status}`);
        return { verified: false, error: `Transaction status: ${receipt?.status}`, data: transaction };
      }

      log(`Transaction verified successfully on Hedera: ${txIdString}`);
      return {
        verified: true,
        error: null,
        type: 'hedera_transaction',
        data: {
          transactionId: transaction.transaction_id,
          status: receipt.status,
          amount: transaction.transfers?.[0]?.amount || null,
          entityId: receipt.entity_id,
          timestamp: transaction.consensus_timestamp,
          from: transaction.charged_tx_fee ? transactionData.transactions[0].entity_id : null,
          to: receipt.entity_id,
          memo: transaction.memo_base64 ? Buffer.from(transaction.memo_base64, 'base64').toString() : null,
        },
      };
      } catch (err: any) {
        // Check if error is 404 (not found) - might be a payment reference instead
        if (err?.response?.status === 404) {
          log(`Hedera transaction not found. This may be a payment reference or pending transaction.`);
          return {
            verified: false,
            error: 'Transaction not found on Hedera Mirror Node (may be pending or payment reference)',
            data: null,
          };
        }
        
        log(`Error verifying Hedera transaction: ${err?.message || err}`);
        return {
          verified: false,
          error: err?.message || 'Failed to verify transaction',
          data: null,
        };
      }
    }

  /**
   * Helper function to extract Hedera transaction ID from P2P object or payment response
   * Transaction ID format: "0.0.XXXXX@171234567890" (accountId@consensusTimestamp)
   * 
   * Extraction priority:
   * 1. Direct transactionId field
   * 2. Encoded transfer data (encodedHHTransfer base64)
   * 3. Construct from payer (wallet ID) + timestamp
   * 4. Use paymentRef as fallback (for verification against Mirror Node)
  */
  static extractTransactionId(p2pObj?: any, paymentResponse?: any): string | null {
    // Try 1: Direct transactionId from P2P object (from wallet)
    if (p2pObj?.transactionId) {
      return p2pObj.transactionId;
    }
  
    // Try 2: Direct transactionId from payment response
    if (paymentResponse?.transactionId) {
      return paymentResponse.transactionId;
    }
  
    // Try 3: Decode encodedHHTransfer to get transaction details
    if (p2pObj?.encodedHHTransfer) {
      try {
        const transferData = JSON.parse(Buffer.from(p2pObj.encodedHHTransfer, 'base64').toString());
        if (transferData?.transactionId) {
          return transferData.transactionId;
        }
        // Try to construct from transfer data
        if (transferData?.from && transferData?.timestamp) {
          return `${transferData.from}@${transferData.timestamp}`;
        }
      } catch (e) {
        log(`Failed to decode encodedHHTransfer: ${e}`);
      }
    }
  
    // Try 4: Construct from payer (wallet account ID) + p2p timeStamp
    if (p2pObj?.payer && p2pObj?.timeStamp) {
      // Format: accountId@consensusTimestamp (in nanoseconds or milliseconds)
      // If timeStamp is in seconds/milliseconds, convert to proper format
      const timestamp = p2pObj.timeStamp;
      const formattedTimestamp = String(timestamp).length <= 10 ? timestamp * 1000000000 : timestamp;
      return `${p2pObj.payer}@${formattedTimestamp}`;
    }
    
    // Try 5: Use paymentRef as alternative identifier (not ideal but useful for tracking)
    if (paymentResponse?.data?.paymentRef) {
      log(`Warning: Using paymentRef instead of transactionId: ${paymentResponse.data.paymentRef}`);
      return paymentResponse.data.paymentRef; // Not a real Hedera TX ID but useful for tracking
    }
  
    return null;
  }
}

// ============ Common Class ============
export class CommonService {
  static async checkoutValidator(req: any, res: any): Promise<{isValid: boolean, message: string}> {
    let mandatory_fields = ['amount', 'currency', 'user_id', 'store_id'];
    let message = ""
    const isValid = mandatory_fields.every((field) => {
      log(`Validating field :: ${field}`);
      if ( !req.body.hasOwnProperty(field) || (req.body[field] === undefined || req.body[field] === null || req.body[field] === '')) {
        message = `Missing mandatory field in request body :: ${field}`
        log(message);
        return false;
      }
      return true;
    });
    if(req.body.referrer_1_Account && !req.body.referrer_1_distribution_share){
      message = `Missing distribution share for referrer accounts. Please provide referrer_1_distribution_share in the request body.`
      log(message);
      return {isValid: false, message}
    }
    if(req.body.referrer_2_Account && !req.body.referrer_2_distribution_share){
      message = `Missing distribution share for referrer accounts. Please provide referrer_2_distribution_share in the request body.`
      log(message);
      return {isValid: false, message}
    }
    return {isValid, message}
  }

  static async userCheckoutValidator(req: any, res: any): Promise<{isValid: boolean, message: string}> {
    let mandatory_fields = ['amount', 'currency', 'user_id', 'store_id', 'userMerchantAccount'];
    let message = ""
    const isValid = mandatory_fields.every((field) => {
      //log(`Validating field :: ${field}`);
      if ( !req.body.hasOwnProperty(field) || (req.body[field] === undefined || req.body[field] === null || req.body[field] === '')) {
        message = `Missing mandatory field in request body :: ${field}`
        log(message);
        return false;
      }
      return true;
    });
    if(req.body.referrer_1_Account && !req.body.referrer_1_distribution_share){
      message = `Missing distribution share for referrer accounts. Please provide referrer_1_distribution_share in the request body.`
      log(message);
      return {isValid: false, message}
    }
    if(req.body.referrer_2_Account && !req.body.referrer_2_distribution_share){
      message = `Missing distribution share for referrer accounts. Please provide referrer_2_distribution_share in the request body.`
      log(message);
      return {isValid: false, message}
    }
    return {isValid, message}
  }

  static async getCallbackUrl(req: any, platform_distribution_share?: any, referrer_1_distribution_share?: any, referrer_2_distribution_share?: any, referrer_1_Account?: string, referrer_2_Account?: string): Promise<{ callbackUrl: string, distribution: string | undefined }> {
    console.log(`Inside getCallbackUrl function request protocol: ${req.protocol} request host:${req.get('host')}`);
    const protocol = process.env.PROTOCOL || req.protocol;
    const host = req.get('host') || process.env.DROPP_API_BASE_URL;
    const baseUrl = `${protocol}://${host}/api/payments`;
    let distribution_obj: any = {};
    let distribution: string | undefined = undefined;
    log(`[Inside getCallbackUrl] platform_distribution_share: ${platform_distribution_share}-> type of platform_distribution_share: ${typeof platform_distribution_share}`);
    if (platform_distribution_share) {
        var DROPP_PARENT_MERCHANT_ID = process.env.DROPP_PARENT_MERCHANT_ID.trim() || process.env.DROPP_MERCHANT_ID.trim();
        const platform_parsedShare = typeof platform_distribution_share === 'string' ? parseFloat(platform_distribution_share) : platform_distribution_share;
        distribution_obj = { [DROPP_PARENT_MERCHANT_ID]: platform_parsedShare };
        log(`[Inside getCallbackUrl] platformMerchantdistribution_share: ${platform_parsedShare}-> type of platform_parsedShare: ${typeof platform_parsedShare}`);
        log(`[Inside getCallbackUrl] DROPP_PARENT_MERCHANT_ID: ${DROPP_PARENT_MERCHANT_ID}`);
      } 
    if (referrer_1_distribution_share){
        var DROPP_REFERRER_1_ACCOUNT_ID = referrer_1_Account.trim() || process.env.DROPP_REFERRER_1_ACCOUNT_ID.trim();
        const referrer_1_parsedShare = typeof referrer_1_distribution_share === 'string' ? parseFloat(referrer_1_distribution_share) : referrer_1_distribution_share;
        distribution_obj[DROPP_REFERRER_1_ACCOUNT_ID] = referrer_1_parsedShare;
        log(`[Inside getCallbackUrl] referrer_1_Account: ${DROPP_REFERRER_1_ACCOUNT_ID} referrer_1_distribution_share: ${referrer_1_parsedShare}-> type of referrer_1_parsedShare: ${typeof referrer_1_parsedShare}`);
    }
    if (referrer_2_distribution_share){
        var DROPP_REFERRER_2_ACCOUNT_ID = referrer_2_Account.trim() || process.env.DROPP_REFERRER_2_ACCOUNT_ID.trim();
        const referrer_2_parsedShare = typeof referrer_2_distribution_share === 'string' ? parseFloat(referrer_2_distribution_share) : referrer_2_distribution_share;
        distribution_obj[DROPP_REFERRER_2_ACCOUNT_ID] = referrer_2_parsedShare;
        log(`[Inside getCallbackUrl] referrer_2_Account: ${DROPP_REFERRER_2_ACCOUNT_ID} referrer_2_distribution_share: ${referrer_2_parsedShare}-> type of referrer_2_parsedShare: ${typeof referrer_2_parsedShare}`);
    }
    log(`[Inside getCallbackUrl] distribution_obj::${JSON.stringify(distribution_obj)} type of distribution_obj: ${typeof distribution_obj}`);
    const callbackUrl = Object.keys(distribution_obj).length > 0 ? `${baseUrl}/post-callback-v2` : `${baseUrl}/post-callback-v1`;
    distribution = JSON.stringify(distribution_obj);
    log(`[Inside getCallbackUrl] distribution::${distribution} type of distribution: ${typeof distribution}`);
    return {callbackUrl,distribution};
  }

  static async buildCustomDescription(req: any, res: any): Promise<{ description: string, additional_details: any }> {
    var additional_details = req.body.additional_details || {};
    if (Object.keys(additional_details).length > 0) {
        additional_details.user_id = req.body.user_id;
        additional_details.store_id = req.body.store_id;
      }else {
        additional_details = {
          user_id: req.body.user_id,
          store_id: req.body.store_id
        };
      }
      if (req.body.hasOwnProperty('emailId') && req.body.emailId) {
        additional_details.emailId = req.body.emailId;
      }
      if (req.body.hasOwnProperty('service_id') && req.body.service_id) {
        const service_id = req.body.service_id;
        additional_details = {
          ...additional_details,
          service_id: service_id,
        };
      }
      
      let description = Object.entries(additional_details)
        .map(([key, val]) => `${key}=${val}`)
        .join("; ");
      return { description, additional_details };
  }
  
}

// ============ Checkout Service ============
export interface CheckoutInput {
  merchantAccount: string;
  userMerchantAccount?: string;
  signingKey: string;
  amount: number;
  currency: string;
  user_id: string;
  store_id: string;
  emailId?: string;
  service_id?: string;
  thumbnail?: string;
  successUrl?: string;
  failureUrl?: string;
  title?: string;
  type?: string;
  successMessage?: string;
  purchaseExpiration?: any;
  referralFee?: any;
  referralAccount?: any;
  acceptPaymentDelay?: boolean;
  noOffers?: boolean;
  payByCC?: boolean;
  payByBank?: boolean;
  platform_distribution_share?: number;
  referrer_1_distribution_share?: number;
  referrer_2_distribution_share?: number;
  user_merchant_share?: number;
  callbackUrl: string;
  distribution?: string;
  description?: string;
  additional_details?: any;
}

export class CheckoutService {

  /**
   * Build the createTransactionData object with conditional distribution shares.
   */
  static buildTransactionData(input: CheckoutInput): any {
    const data: any = {
      merchantAccount: input.merchantAccount,
      signingKey: input.signingKey,
      payment_status: 'initiated',
      createdAt: new Date().toISOString(),
      successUrl: input.successUrl,
      failureUrl: input.failureUrl,
      user_id: input.user_id,
      amount: input.amount,
      currency: input.currency,
      service_id: input.service_id,
      store_id: input.store_id,
      emailId: input.emailId,
      payment_method: 'dropp',
      title: input.title,
      type: input.type,
      successMessage: input.successMessage,
    };
    if (input.userMerchantAccount) {
      data.userMerchantAccount = input.userMerchantAccount;
    }
    if (input.platform_distribution_share && input.platform_distribution_share > 0) {
      data.platform_distribution_share = input.platform_distribution_share;
    }
    if (input.referrer_1_distribution_share && input.referrer_1_distribution_share > 0) {
      data.referrer_1_distribution_share = input.referrer_1_distribution_share;
    }
    if (input.referrer_2_distribution_share && input.referrer_2_distribution_share > 0) {
      data.referrer_2_distribution_share = input.referrer_2_distribution_share;
    }
    if (input.user_merchant_share && input.user_merchant_share > 0) {
      data.user_merchant_share = input.user_merchant_share;
    }
    return data;
  }

  /**
   * Create a transaction record in MongoDB and return the reference (transaction_id).
   * Throws on failure so the caller can return an error response.
   */
  static async createTransaction(data: any): Promise<string> {
    const createResp = await TransactionService.create(data);
    if (!createResp.ok) {
      throw new Error('Failed to create transaction record');
    }
    return createResp.data.transaction_id;
  }

  /**
   * Build the payment request payload sent to Dropp SDK's generateUUID.
   */
  static buildPaymentPayload(input: CheckoutInput & { reference: string }): any {
    const payload: any = {
      merchantAccount: input.merchantAccount,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      description: input.description || '',
      thumbnail: input.thumbnail || '',
      url: input.callbackUrl,
      title: input.title || '',
      type: input.type || '',
      purchaseExpiration: input.purchaseExpiration || undefined,
      referralFee: input.referralFee || undefined,
      referralAccount: input.referralAccount || undefined,
      acceptPaymentDelay: input.acceptPaymentDelay || false,
      noOffers: input.noOffers || false,
      payByCC: input.payByCC,
      payByBank: input.payByBank,
      successURL: input.successUrl || '',
      failureURL: input.failureUrl || '',
      successMessage: input.successMessage,
      submitToCallBack: 'GET' as const,
    };
    if (input.distribution) {
      payload.distribution = input.distribution;
    }
    return payload;
  }

  /**
   * Call Dropp SDK to generate a checkout UUID + QR code link.
   * Returns { checkoutId, qrCodeUrl } or throws on SDK error with responseCode != 0.
   */
  static async generateCheckoutUUID(paymentPayload: any): Promise<{ checkoutId: string; qrCodeUrl: string }> {
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const uuidResponse = await droppClient.generateUUID(paymentPayload);
    log(`UUID generated successfully: ${JSON.stringify(uuidResponse)}`);

    if (uuidResponse.responseCode !== 0 || !uuidResponse.data) {
      const errMsg = uuidResponse.errors?.[0] || 'Unknown error';
      throw new Error(`Failed to generate checkout UUID - ${errMsg}`);
    }
    log(`UUID data: ${JSON.stringify(uuidResponse.data)}`);
    return {
      checkoutId: uuidResponse.data.uuid,
      qrCodeUrl: uuidResponse.data.link,
    };
  }

  /**
   * Update the transaction record with checkout details (payment link, status, etc.).
   */
  static async updateTransactionWithCheckout(
    reference: string,
    checkoutId: string,
    qrCodeUrl: string,
    additional_details: any,
    distribution?: string,
  ) {
    const updateData: any = {
      payment_status: 'dropp_checkout_created',
      createdAt: new Date().toISOString(),
      payment_link: qrCodeUrl,
      payment_id: checkoutId,
      additional_details,
    };
    if (distribution) {
      updateData.distribution = distribution;
    }
    const updateResp = await TransactionService.update(reference, updateData);
    if (!updateResp.ok) {
      log('Failed to update checkout details to MongoDB.');
    }
  }

  /**
   * Build the final checkout success response payload.
   */
  static buildCheckoutResponse(checkoutId: string, qrCodeUrl: string, reference: string) {
    const redirectUrl = qrCodeUrl || `https://dropp.app.link/checkouts/${checkoutId}?uuid=${checkoutId}`;
    return {
      checkoutId,
      redirectUrl,
      qrCodeUrl,
      unthink_transactionReference: reference,
      message: 'Redirect the user to the redirectUrl to complete the payment',
    };
  }
}

// ============ Shared callback result types ============
export interface ParsedCallback {
  p2pObj: droppSdk.IPromiseToPay;
  invoiceData: IInvoice;
  checkoutId: string;
  merchantId: string;
}

export interface PaymentResult {
  isSuccess: boolean;
  paymentResponse: droppSdk.DroppResponse;
  hederaTxId: string | null;
  paymentRef: string;
  transactionReference: string;
  receiptURL: string;
}

// ============ PaymentCallbackService ============
export class PaymentCallbackService {

  /**
   * Parse p2p from GET query param, validate and decode invoice.
   * Reusable across post-callback-v1, post-callback-with-redeem, etc.
   */
  static parseCallbackQuery(p2pParam: string): ParsedCallback {
    if (!p2pParam) {
      throw { statusCode: 400, message: 'Missing p2p query parameter' };
    }

    let p2pObj: droppSdk.IPromiseToPay;
    try {
      p2pObj = JSON.parse(p2pParam);
    } catch (parseError: any) {
      throw { statusCode: 400, message: `Invalid p2p JSON: ${parseError.message}` };
    }

    let invoiceData: IInvoice;
    try {
      invoiceData = JSON.parse(Buffer.from(p2pObj.invoiceBytes, 'base64').toString());
    } catch (decodeError: any) {
      throw { statusCode: 400, message: 'Invalid invoiceBytes encoding' };
    }

    const checkoutId = invoiceData.qrCodeUUID || (p2pObj as any).checkoutId || '';
    const merchantId = invoiceData.merchantAccount;

    log(`Parsed callback – payer: ${p2pObj.payer}, merchant: ${merchantId}, amount: ${invoiceData.amount} ${invoiceData.currency}, ref: ${invoiceData.reference}`);
    log(`Decoded invoice data: ${JSON.stringify(invoiceData)}`);
    log(`Full p2p object: ${JSON.stringify(p2pObj)}`);
    return { p2pObj, invoiceData, checkoutId, merchantId };
  }

  /**
   * Mark transaction as payment_received and retrieve stored URLs / keys.
   */
  static async markPaymentReceived(reference: string, p2pObj: droppSdk.IPromiseToPay, invoiceData: IInvoice) {
    let successUrl = '';
    let failureUrl = '';
    let user_merchant_share = 0;
    let signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY || '';
    let userMerchantAccount = '';
    let user_id = '';
    let service_id = '';
    let store_id = '';
    let emailId = '';
    let title = '';
    let description = '';

    try {
      const updateResp = await TransactionService.update(reference, {
        p2pData: p2pObj,
        invoiceData: invoiceData,
        payment_status: 'payment_received',
      });
      if (updateResp.ok) {
        successUrl = updateResp.successUrl || '';
        failureUrl = updateResp.failureUrl || '';
        signingKey = updateResp.signingKey || signingKey;
        user_merchant_share = updateResp.user_merchant_share || 0;
        userMerchantAccount = updateResp.data?.userMerchantAccount || '';
        user_id = updateResp.data?.user_id || '';
        service_id = updateResp.data?.service_id || '';
        store_id = updateResp.data?.store_id || '';
        emailId = updateResp.data?.emailId || '';
        title = updateResp.data?.title || '';
        description = updateResp.data?.description || '';
      } else {
        log('Failed to update checkout details to MongoDB.');
      }
    } catch (dbError) {
      log(`Failed to save payment_received details to MongoDB: ${dbError}`);
    }
    log(`Payment received for main reference ${reference}. successUrl: ${successUrl}, failureUrl: ${failureUrl}, signingKey: ${signingKey}, user_merchant_share: ${user_merchant_share}, userMerchantAccount: ${userMerchantAccount}, user_id: ${user_id}, service_id: ${service_id}, store_id: ${store_id}, emailId: ${emailId}, title: ${title}, description: ${description}`);
    return { successUrl, failureUrl, signingKey, user_merchant_share, userMerchantAccount, user_id, service_id, store_id, emailId, title, description};
  }

  /**
   * Submit a standard payment via DroppPaymentRequest SDK.
   * Returns a structured PaymentResult.
   */
  static async submitPayment(
    p2pObj: droppSdk.IPromiseToPay,
    signingKey: string,
  ): Promise<PaymentResult> {
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    log(`Submitting payment with signing key: ${signingKey}`);

    const paymentResponse = await new droppSdk.DroppPaymentRequest(droppClient)
      .submit(p2pObj, signingKey);

    const hederaTxId = HederaService.extractTransactionId(p2pObj, paymentResponse);
    if (hederaTxId) log(`Hedera Transaction ID: ${hederaTxId}`);

    const isSuccess = paymentResponse.responseCode === 0;
    const paymentRef = paymentResponse?.data?.paymentRef || (paymentResponse as any)?.paymentRef || '';
    const transactionReference = paymentResponse?.data?.transactionReference || (paymentResponse as any)?.transactionReference || '';
    const receiptURL = paymentResponse?.data?.receiptURL || (paymentResponse as any)?.receiptURL || '';

    return { isSuccess, paymentResponse, hederaTxId, paymentRef, transactionReference, receiptURL };
  }

  /**
   * Submit a payment with sub-merchant distribution support.
   * Uses submitForSubMerchant when distribution data is present, otherwise falls back to submit.
   */
  static async submitPaymentWithDistribution(
    p2pObj: droppSdk.IPromiseToPay,
    signingKey: string,
    invoiceData: IInvoice,
  ): Promise<PaymentResult> {
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    log(`Submitting payment with signing key: ${signingKey}`);

    const isSubMerchantPayment = invoiceData.distribution || p2pObj.distributionBytes;
    const parentMerchantId = process.env.DROPP_PARENT_MERCHANT_ID || process.env.DROPP_MERCHANT_ID!;

    let paymentResponse: droppSdk.DroppResponse;
    if (isSubMerchantPayment && Object.keys(isSubMerchantPayment).length > 0) {
      log(`Submitting sub-merchant payment for parent merchant: ${parentMerchantId}`);
      paymentResponse = await new droppSdk.DroppPaymentRequest(droppClient)
        .submitForSubMerchant(p2pObj, signingKey, parentMerchantId);
    } else {
      log(`Submitting regular merchant payment`);
      paymentResponse = await new droppSdk.DroppPaymentRequest(droppClient)
        .submit(p2pObj, signingKey);
    }

    const hederaTxId = HederaService.extractTransactionId(p2pObj, paymentResponse);
    if (hederaTxId) log(`Hedera Transaction ID: ${hederaTxId}`);

    const isSuccess = paymentResponse.responseCode === 0;
    const paymentRef = paymentResponse?.data?.paymentRef || (paymentResponse as any)?.paymentRef || '';
    const transactionReference = paymentResponse?.data?.transactionReference || (paymentResponse as any)?.transactionReference || '';
    const receiptURL = paymentResponse?.data?.receiptURL || (paymentResponse as any)?.receiptURL || '';

    return { isSuccess, paymentResponse, hederaTxId, paymentRef, transactionReference, receiptURL };
  }

  /**
   * Update transaction record in MongoDB after payment completes or fails.
   */
  static async updateTransactionAfterPayment(
    reference: string,
    result: PaymentResult,
  ) {
    try {
      if (result.isSuccess) {
        await TransactionService.update(reference, {
          payment_status: 'completed',
          paymentResponse: result.paymentResponse,
          hederaTransactionId: result.hederaTxId,
          receiptURL: result.receiptURL,
        });
        log(`Transaction ${reference} updated to completed.`);
      } else {
        await TransactionService.update(reference, {
          payment_status: 'failed',
          paymentResponse: result.paymentResponse,
        });
        log(`Transaction ${reference} updated to failed.`);
      }
    } catch (dbError) {
      log(`Failed to update transaction ${reference} in MongoDB: ${dbError}`);
    }
  }

  /**
   * Update transaction on payment error (SDK rejection / network error).
   */
  static async updateTransactionOnError(reference: string, error: any) {
    try {
      const errorPayload = error?.response?.data || error?.data || error;
      await TransactionService.update(reference, {
        payment_status: 'failed',
        paymentResponse: errorPayload,
      });
      log(`Transaction ${reference} updated to failed (error).`);
    } catch (dbError) {
      log(`Failed to update transaction ${reference} on error: ${dbError}`);
    }
  }

  /**
   * Build redirect URL with common payment params appended as query string.
   */
  static buildRedirectUrl(
    baseUrl: string,
    params: {
      checkoutId: string;
      isSuccess: boolean;
      reference: string;
      amount: string | number;
      currency: string;
      payer: string;
      paymentRef?: string;
      transactionReference?: string;
      hederaTxId?: string | null;
      receiptURL?: string;
      errorMessage?: string;
    },
  ): string {
    const url = new URL(baseUrl);
    url.searchParams.append('checkoutId', params.checkoutId);
    url.searchParams.append('status', params.isSuccess ? 'success' : 'failed');
    url.searchParams.append('reference', params.reference);

    if (params.isSuccess) {
      url.searchParams.append('amount', String(params.amount));
      url.searchParams.append('currency', params.currency);
      url.searchParams.append('payer', params.payer);
      if (params.paymentRef) url.searchParams.append('paymentRef', params.paymentRef);
      if (params.transactionReference) url.searchParams.append('transactionReference', params.transactionReference);
      if (params.hederaTxId) url.searchParams.append('hederaTransactionId', params.hederaTxId);
      if (params.receiptURL) url.searchParams.append('receiptURL', params.receiptURL);
    } else {
      if (params.errorMessage) url.searchParams.append('error', params.errorMessage);
    }

    return url.toString();
  }

  /**
   * Core redeem / credit-payment logic.
   * Creates a transaction record, submits via DroppCreditPaymentRequest,
   * and updates the transaction on success or failure.
   *
   * Used by:
   *  - POST /redeem  (standalone redeem endpoint)
   *  - GET  /post-callback-with-redeem  (auto-payout after successful payment)
   */
  static async processRedeem(opts: {
    userMerchantAccount: string;
    amount: number;
    currency?: string;
    creditReference?: string;
    ipAddress?: string;
    /** Extra metadata stored on the transaction record */
    meta?: Record<string, any>;
  }): Promise<{ success: boolean; redeemResponse?: any; reference?: string; error?: string }> {
    const merchantAccountId = process.env.DROPP_MERCHANT_ID!;
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    const currency = opts.currency || 'USD';
    const creditReference = opts.creditReference || 'Credit redemption';

    if (opts.amount <= 0) {
      log(`Redeem skipped – amount is ${opts.amount}`);
      return { success: true, redeemResponse: null };
    }

    const redemptionData: DroppRedemptionData = {
      merchantAccountId,
      userAccountId: opts.userMerchantAccount,
      amount: Number(opts.amount),
      currency,
      creditReference,
      ipAddress: opts.ipAddress || '127.0.0.1',
    };

    //-------- Create transaction record in MongoDB --------
    let reference: string | undefined;
    try {
      const createResp = await TransactionService.create({
        merchantAccount: merchantAccountId,
        userMerchantAccount: opts.meta?.userMerchantAccount || '',
        payment_status: 'initiated',
        createdAt: new Date().toISOString(),
        user_id: opts.meta?.user_id || '',
        amount: Number(opts.amount),
        currency,
        creditReference,
        ipAddress: opts.ipAddress || '127.0.0.1',
        payment_method: 'dropp',
        title: opts.meta?.title || 'Merchant Payout',
        description: opts.meta?.description || 'Payout to merchant wallet',
        type: opts.meta?.type || 'merchant_payout',
        service_id: opts.meta?.service_id || `merchant_payout_${opts.meta?.userMerchantAccount || ''}_${new Date().getTime()}`,
        store_id: opts.meta?.store_id || '1668778066', //unthink_ai store id
        emailId: opts.meta?.emailId || '',
        ...(opts.meta || {}),
      });
      if (createResp.ok) {
        reference = createResp.data?.transaction_id;
        log(`Redeem transaction record created. Reference: ${reference}`);
      } else {
        log('Failed to create redeem transaction in MongoDB.');
      }
    } catch (dbError) {
      log(`Failed to save redeem transaction to MongoDB: ${dbError}`);
    }

    //-------- Submit via SDK --------
    log(`Credit payment. Initiating: ${currency} ${opts.amount}, ${merchantAccountId} --> ${opts.userMerchantAccount}`);

    try {
      const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
      const redeemResponse = await new droppSdk.DroppCreditPaymentRequest(droppClient)
        .submit(redemptionData, signingKey);

      const redeemSuccess = redeemResponse.responseCode === 0;
      log(`Credit payment ${redeemSuccess ? 'succeeded' : 'failed'}: ${JSON.stringify(redeemResponse)}`);

      //-------- Update transaction on success / SDK-level failure --------
      if (reference) {
        try {
          await TransactionService.update(reference, {
            payment_status: redeemSuccess ? 'completed' : 'failed',
            updatedAt: new Date().toISOString(),
            paymentResponse: redeemResponse,
          });
        } catch (dbError) {
          log(`Failed to update redeem transaction in MongoDB: ${dbError}`);
        }
      }

      return { success: redeemSuccess, redeemResponse, reference };
    } catch (err: any) {
      log(`Credit payment error: ${formatError(err)}`);

      //-------- Update transaction on error --------
      if (reference) {
        try {
          await TransactionService.update(reference, {
            payment_status: 'failed',
            updatedAt: new Date().toISOString(),
            error: getErrorMessage(err),
          });
        } catch (dbError) {
          log(`Failed to update redeem transaction in MongoDB: ${dbError}`);
        }
      }

      return { success: false, error: getErrorMessage(err), reference };
    }
  }

}