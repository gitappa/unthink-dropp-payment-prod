import { PreAuthPaymentPayload, PreAuthDueData } from "./dropp-payloads";
import { DroppClient } from "./dropp-client";
import { DroppResponse } from "./dropp-response";
export declare class DroppPreAuthPaymentRequest {
    private droppClient;
    constructor(droppHttpClient: DroppClient);
    submitForAuthorization(payload: PreAuthPaymentPayload, signingKey: string): Promise<DroppResponse>;
    submitSubMerchantForAuthorization(payload: PreAuthPaymentPayload, signingKey: string): Promise<DroppResponse>;
    submitForPayment(paymentDueData: PreAuthDueData, signingKey: string): Promise<DroppResponse>;
    private submit;
}
