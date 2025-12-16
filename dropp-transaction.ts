//import * as droppSdk from './dropp-sdk-js';
import * as droppSdk from 'dropp-sdk-js';
import { ServerResponse } from 'http';
import { DroppResponse } from './dropp-sdk-js/dropp-response';
import { TransactionRequest } from './dropp-sdk-js/dropp-transaction-payloads';

type CallbackFunction = (returnValue: DroppResponse, res: ServerResponse) => void;

function getTransactions(requestParameters: TransactionRequest, res: ServerResponse, callback: CallbackFunction): void {
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    const parentMerchantAccountId = process.env.DROPP_MERCHANT_ID!;
    new droppSdk.DroppTransactionRequest(droppClient).getTransactions(requestParameters, parentMerchantAccountId, signingKey)
        .then(function (response: DroppResponse) {
            callback(response, res);
        })
        .catch(function (error: any) {
            console.log(`paymentError: ${error}`);
            callback(error, res);
        });
}

export { getTransactions };