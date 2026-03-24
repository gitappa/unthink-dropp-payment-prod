import * as droppSdk from './dropp-sdk-js';
import { IncomingMessage, ServerResponse } from 'http';
import { DroppResponse } from './dropp-sdk-js/dropp-response';
import { IPromiseToPay } from './dropp-sdk-js/dropp-payloads';
import { DroppRedemptionData } from './dropp-sdk-js/dropp-redemption-data';
import { DroppRefundData } from 'dropp-sdk-js/dropp-refund-data';
import { RecurringPaymentPayload, PreAuthPaymentPayload, RecurringDueData, PreAuthDueData } from "./dropp-sdk-js/dropp-payloads";
import PaymentRequestData  from './dropp-sdk-js/payment-request-data';

type CallbackFunction = (returnValue: DroppResponse, res: ServerResponse) => void;

function processPayment(p2pObj: IPromiseToPay, res: ServerResponse, callback: CallbackFunction): void {
    // NOTE: validate p2p is as per your needs to confirm everything is in order as you expect.
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    new droppSdk.DroppPaymentRequest(droppClient).submit(p2pObj, signingKey)
        .then(function (paymentResponse: DroppResponse) {
            callback(paymentResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log(`paymentError: ${paymentError}`);
            callback(paymentError, res);
        });
}

function processPaymentForSubMerchant(p2pObj: IPromiseToPay, res: ServerResponse, callback: CallbackFunction): void {
    // NOTE: validate p2p is as per your needs to confirm everything is in order as you expect.
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    new droppSdk.DroppPaymentRequest(droppClient).submitForSubMerchant(p2pObj, signingKey, process.env.DROPP_MERCHANT_ID)
        .then(function (paymentResponse: DroppResponse) {
            callback(paymentResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log(`paymentError: ${paymentError}`);
            callback(paymentError, res);
        });
}

function processRecurringPayment(recurringDataObj: RecurringPaymentPayload, res: ServerResponse, callback: CallbackFunction): void {
    // const signingKey = process.env.SIGNING_KEY!;
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY || process.env.SIGNING_KEY;
    if (!signingKey) {
        const err = new Error('Missing signing key: set DROPP_MERCHANT_SIGNING_KEY in environment');
        console.error(err.message);
        callback({ responseCode: 1, message: err.message } as any, res);
        return;
    }
    const rps = new droppSdk.DroppRecurringPaymentRequest(new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!));
    rps.submitForAuthorization(recurringDataObj, signingKey)
        .then(function (apiResponse: DroppResponse) {
            if (apiResponse.responseCode === 0) {
                const recurringToken = apiResponse.data.recurringToken;
                console.log(`Recurring Authorization Token: ${recurringToken}`);

                rps.submitForPayment(
                    {
                        merchantAccountId: process.env.DROPP_MERCHANT_ID!,
                        amount: 0.01,
                        recurringToken: recurringToken
                    },
                    signingKey)
                    .then(function (paymentResponse: DroppResponse) {
                        callback(paymentResponse, res);
                    })
                    .catch(function (paymentError: any) {
                        console.log(`Recurring Payment Error: ${JSON.stringify(paymentError)}`);
                        callback(paymentError, res);
                    });
            }
        })
        .catch(function (paymentError: any) {
            console.log(`Recurring Authorization Error: ${JSON.stringify(paymentError)}`);
            callback(paymentError, res);
        });
}

function processRecurringPaymentDue(data: RecurringDueData, res: ServerResponse, callback: CallbackFunction): void {
    // NOTE: validate p2p is as per your needs to confirm everything is in order as you expect.
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    const rps = new droppSdk.DroppRecurringPaymentRequest(droppClient);
    const recurringToken = data.recurringToken;
    const amount = data.amount;

    console.log(`    - Data received: ${JSON.stringify(data)}`);

    rps.submitForPayment(
        {
            merchantAccountId: process.env.DROPP_MERCHANT_ID!,
            amount: amount,
            recurringToken: recurringToken
        },
        signingKey)
        .then(function (paymentResponse: DroppResponse) {
            callback(paymentResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log(`Recurring Payment Error: ${JSON.stringify(paymentError)}`);
            callback(paymentError, res);
        });
}

function processCreditPayment(data: DroppRedemptionData, res: ServerResponse, callback: CallbackFunction): void {
    // NOTE: validate data is as per your needs to confirm everything is in order as you expect.
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    new droppSdk.DroppCreditPaymentRequest(droppClient).submit(data, signingKey)
        .then(function (paymentResponse: DroppResponse) {
            callback(paymentResponse, res);
        })
        .catch(function (paymentError: any) {
            callback(paymentError, res);
        });
}

function processRefund(data: DroppRefundData, res: ServerResponse, callback: CallbackFunction): void {
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    new droppSdk.DroppRefundRequest(droppClient).submit(data, signingKey)
        .then(function (paymentResponse: DroppResponse) {
            callback(paymentResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log("Error response received from Dropp Refund API: " + JSON.stringify(paymentError));
            callback(paymentError, res);
        });
}

function generateUUID(paymentDetails: PaymentRequestData, res: ServerResponse, callback: CallbackFunction): void {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
  droppClient.generateUUID(paymentDetails)
    .then((uuidResponse: any) => callback(uuidResponse, res))
    .catch((error: any) => {
      console.error(`UUID Generation Error: ${error}`);
      callback(error, res);
    });
}

function checkUUIDStatus(uuid: string, callback: (result: any) => void): void {
  const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
  droppClient.waitForCompletion(uuid, 3)
    .then((result: any) => {
      callback({
        responseCode: 0,
        data: {
          uuid,
          status: result.data
        }
      });
    })
    .catch((error: any) => {
      console.error(error);
      callback({
        responseCode: 1,
        data: {
          uuid,
          status: 'error',
          message: error.message || 'Unknown error'
        }
      });
    });
}

function processPreAuthPayment(recurringDataObj: PreAuthPaymentPayload, res: ServerResponse, callback: CallbackFunction): void {
    // Prefer the standard merchant signing key, fall back to legacy SIGNING_KEY if present
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY || process.env.SIGNING_KEY;
    if (!signingKey) {
        const err = new Error('Missing signing key: set DROPP_MERCHANT_SIGNING_KEY in environment');
        console.error(err.message);
        callback({ responseCode: 1, message: err.message } as any, res);
        return;
    }
    const droppPreAuth = new droppSdk.DroppPreAuthPaymentRequest(new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!));
    console.log(`recurringDataObj ${JSON.stringify(recurringDataObj)}`);
    droppPreAuth.submitForAuthorization(recurringDataObj, signingKey)
        .then(function (apiResponse: DroppResponse) {
            console.log(`Pre Auth Payment Response: ${JSON.stringify(apiResponse)}`);

            if (apiResponse.responseCode === 0) {
                const tokenResponse = apiResponse.data;
                console.log('getting tokenResponse ', tokenResponse);
                console.log(`Pre Auth Authorization Token: ${tokenResponse.recurringToken}`);
            }
            callback(apiResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log(`Pre Auth Payment Authorization Error: ${paymentError}`);
            console.log(`Pre Auth Authorization Error: ${JSON.stringify(paymentError)}`);
            callback(paymentError, res);
        });

}
function processSubMerchantPreAuthPayment(recurringDataObj: PreAuthPaymentPayload, res: ServerResponse, callback: CallbackFunction): void {
    // Prefer the standard merchant signing key, fall back to legacy SIGNING_KEY if present
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY || process.env.SIGNING_KEY;
    if (!signingKey) {
        const err = new Error('Missing signing key: set DROPP_MERCHANT_SIGNING_KEY in environment');
        console.error(err.message);
        callback({ responseCode: 1, message: err.message } as any, res);
        return;
    }
    const droppPreAuth = new droppSdk.DroppPreAuthPaymentRequest(new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!));
    console.log(`recurringDataObj ${JSON.stringify(recurringDataObj)}`);
    droppPreAuth.submitSubMerchantForAuthorization(recurringDataObj, signingKey)
        .then(function (apiResponse: DroppResponse) {
            console.log(`Pre Auth Payment Response: ${JSON.stringify(apiResponse)}`);
            callback(apiResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log(`Pre Auth Payment Error: ${JSON.stringify(paymentError)}`);
            callback(paymentError, res);
        });
}
function processPreAuthPaymentDue(data: PreAuthDueData, res: ServerResponse, callback: CallbackFunction): void {
    // NOTE: validate p2p is as per your needs to confirm everything is in order as you expect.
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    const droppPreAuth = new droppSdk.DroppPreAuthPaymentRequest(droppClient);
    const recurringToken = data.recurringToken;
    const amount = data.amount;

    console.log(`    - Data received: ${JSON.stringify(data)}`);

    droppPreAuth.submitForPayment(
        {
            merchantAccountId: process.env.DROPP_MERCHANT_ID!,
            amount: amount,
            recurringToken: recurringToken,
            action: data.action
        },
        signingKey)
        .then(function (paymentResponse: DroppResponse) {
            callback(paymentResponse, res);
        })
        .catch(function (paymentError: any) {
            console.log(`Recurring Payment Error: ${JSON.stringify(paymentError)}`);
            callback(paymentError, res);
        });
}

export { processPayment, processPaymentForSubMerchant, processCreditPayment, processRecurringPayment, processPreAuthPayment, processSubMerchantPreAuthPayment, processRecurringPaymentDue, processPreAuthPaymentDue, processRefund, generateUUID, checkUUIDStatus };
