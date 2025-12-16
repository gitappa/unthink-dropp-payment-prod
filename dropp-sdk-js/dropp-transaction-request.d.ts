import { DroppResponse } from "./dropp-response";
import { TransactionRequest } from "./dropp-transaction-payloads";
import { DroppClient } from "./dropp-client";
export declare class DroppTransactionRequest {
    protected droppClient: DroppClient;
    constructor(droppHttpClient: DroppClient);
    getTransactions(requestParameters: TransactionRequest, parentMerchantAccountId: string, signingKey: string): Promise<DroppResponse>;
    private fetchTransactions;
}
