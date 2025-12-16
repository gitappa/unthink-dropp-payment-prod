import { DroppResponse } from "./dropp-response";
import { IPromiseToPay } from "./dropp-payloads";
import { DroppClient } from "./dropp-client";
export declare class DroppPaymentRequest {
    protected droppClient: DroppClient;
    constructor(droppHttpClient: DroppClient);
    submit(promiseToPay: IPromiseToPay, signingKey: string): Promise<DroppResponse>;
    submitForSubMerchant(promiseToPay: IPromiseToPay, signingKey: string, parentMerchantAccountId: string): Promise<DroppResponse>;
    private submitForPayment;
    private submitForSubMerchantPayment;
}
